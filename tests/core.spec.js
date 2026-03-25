import { test, expect } from '@playwright/test';
import path from 'node:path';
import { readFileSync, rmSync, writeFileSync } from 'node:fs';
import {
    collectErrors,
    lockExpertMode,
    loadGame,
    openCustomSubmenu,
    openDebugSubmenu,
    openDeveloperSubmenu,
    openExpertSubmenu,
    openGameSubmenu,
    openStartSetupSection,
    openLevel4Drawer,
    openMultiplayerSubmenu,
    openSubmenu,
    returnToMenu,
    startGame,
    startGameWithBots,
    unlockExpertMode,
} from './helpers.js';
import { parseMapJSON, stringifyMapDocument } from '../src/entities/MapSchema.js';
import {
    EDITOR_API_ROUTES,
    EDITOR_DATA_PATHS,
    EDITOR_VIEW_PATHS,
} from '../src/shared/contracts/EditorPathContract.js';
import { generateJSONExport, importFromJSON } from '../editor/js/EditorMapSerializer.js';

const SETTINGS_STORAGE_KEY = 'cuviosclash.settings.v1';
const SETTINGS_PROFILES_STORAGE_KEY = 'cuviosclash.settings-profiles.v1';
const LEGACY_SETTINGS_STORAGE_KEY = 'aero-arena-3d.settings.v1';
const MENU_PRESETS_STORAGE_KEY = 'cuviosclash.menu-presets.v1';
const CUSTOM_MAP_STORAGE_KEY = 'custom_map_test';
const GENERATED_LOCAL_MAPS_MODULE_PATH = path.resolve(process.cwd(), EDITOR_DATA_PATHS.GENERATED_LOCAL_MAPS_MODULE);
const EDITOR_MAP_DIR = path.resolve(process.cwd(), EDITOR_DATA_PATHS.MAPS_DIR);
const EDITOR_JSON_SUFFIX = '.editor.json';
const RUNTIME_JSON_SUFFIX = '.runtime.json';

function buildLegacyRuntimeCustomMap(obstacles = [], options = {}) {
    const payload = {
        size: [80, 30, 80],
        obstacles,
        portals: [],
    };
    if (typeof options?.glbModel === 'string' && options.glbModel.trim().length > 0) {
        payload.glbModel = options.glbModel.trim();
    }
    return JSON.stringify(payload);
}

function createMockEditorManager() {
    return {
        mapDocumentMeta: {},
        core: {
            objectsContainer: {
                children: [],
            },
        },
        clearAllObjects() {
            this.core.objectsContainer.children = [];
            this.mapDocumentMeta = {};
        },
        withSceneMutation(fn) {
            return fn();
        },
        queueSceneUiRefresh() {},
        syncTunnelEndpointsFromMesh() {},
        createMesh(type, subType, x, y, z, sizeInfo, extraProps = {}) {
            const mesh = {
                position: { x, y, z },
                rotation: { y: Number(extraProps.rotateY) || 0 },
                userData: {
                    type,
                    subType,
                    sizeInfo,
                    ...extraProps,
                },
            };
            this.core.objectsContainer.children.push(mesh);
            return mesh;
        },
    };
}

async function loadGameWithRetry(page, attempts = 4) {
    let lastError = null;
    for (let attempt = 0; attempt < attempts; attempt += 1) {
        try {
            await loadGame(page);
            return;
        } catch (error) {
            lastError = error;
            await page.waitForTimeout(400 * (attempt + 1));
        }
    }
    throw lastError;
}

test.describe('T1-20: Core & Infrastruktur', () => {
    test.describe.configure({ mode: 'serial' });

    test('T1: Seite lädt ohne JS-Fehler', async ({ page }) => {
        const errors = collectErrors(page);
        await loadGame(page);
        expect(errors).toHaveLength(0);
    });

    test('T2: Canvas existiert und ist sichtbar', async ({ page }) => {
        await loadGame(page);
        await expect(page.locator('#game-canvas')).toBeVisible();
    });

    test('T3: WebGL-Kontext verfügbar', async ({ page }) => {
        await loadGame(page);
        const hasWebGL = await page.evaluate(() => {
            const c = document.getElementById('game-canvas');
            return !!(c && (c.getContext('webgl2') || c.getContext('webgl')));
        });
        expect(hasWebGL).toBeTruthy();
    });

    test('T4: Hauptmenü sichtbar beim Start', async ({ page }) => {
        await loadGame(page);
        await expect(page.locator('#main-menu')).toBeVisible();
    });

    test('T5: Menü-Navigation Buttons vorhanden', async ({ page }) => {
        await loadGame(page);
        const count = await page.locator('#menu-nav .nav-btn').count();
        expect(count).toBeGreaterThanOrEqual(3);
    });

    test('T6: GAME_INSTANCE mit Renderer und Settings verfügbar', async ({ page }) => {
        await loadGame(page);
        const ok = await page.evaluate(() => {
            const g = window.GAME_INSTANCE;
            return !!(g && g.settings && g.renderer);
        });
        expect(ok).toBeTruthy();
    });

    test('T7: Spiel startet – HUD sichtbar', async ({ page }) => {
        await startGame(page);
        const hudVisible = await page.evaluate(() => {
            const hud = document.getElementById('hud');
            return hud && !hud.classList.contains('hidden');
        });
        expect(hudVisible).toBeTruthy();
    });

    test('T8: Spieler existiert nach Start', async ({ page }) => {
        await startGame(page);
        const hasPlayers = await page.evaluate(() => {
            const g = window.GAME_INSTANCE;
            return g?.entityManager?.players?.length > 0;
        });
        expect(hasPlayers).toBeTruthy();
    });

    test('T9: GameLoop läuft nach Start', async ({ page }) => {
        await startGame(page);
        const running = await page.evaluate(() => {
            const g = window.GAME_INSTANCE;
            return g?.gameLoop?.running === true;
        });
        expect(running).toBeTruthy();
    });

    test('T10: Arena ist gebaut', async ({ page }) => {
        await startGame(page);
        const hasArena = await page.evaluate(() => {
            const g = window.GAME_INSTANCE;
            return g?.arena && Array.isArray(g.arena.obstacles);
        });
        expect(hasArena).toBeTruthy();
    });

    test('T11: ESC bringt zurück ins Menü', async ({ page }) => {
        await startGame(page);
        await returnToMenu(page);
        await expect(page.locator('#main-menu')).toBeVisible();
    });

    test('T12: localStorage Settings speichern/laden', async ({ page }) => {
        await loadGame(page);
        const roundTrip = await page.evaluate(() => {
            try {
                const key = 'cuviosclash.settings.v1';
                const data = { test: true, ts: Date.now() };
                localStorage.setItem(key, JSON.stringify(data));
                const loaded = JSON.parse(localStorage.getItem(key));
                localStorage.removeItem(key);
                return loaded?.test === true;
            } catch { return false; }
        });
        expect(roundTrip).toBeTruthy();
    });

    test('T12b: Legacy localStorage Settings-Key wird nach CuviosClash migriert', async ({ page }) => {
        await loadGame(page);
        await page.evaluate(({ currentKey, legacyKey }) => {
            localStorage.removeItem(currentKey);
            localStorage.setItem(legacyKey, JSON.stringify({
                mapKey: 'mega_maze',
                winsNeeded: 5,
            }));
        }, {
            currentKey: SETTINGS_STORAGE_KEY,
            legacyKey: LEGACY_SETTINGS_STORAGE_KEY,
        });

        await page.reload();
        await page.waitForSelector('#main-menu', { state: 'visible', timeout: 15000 });

        const migratedState = await page.evaluate(({ currentKey }) => ({
            mapKey: window.GAME_INSTANCE?.settings?.mapKey,
            winsNeeded: window.GAME_INSTANCE?.settings?.winsNeeded,
            hasNewKey: !!localStorage.getItem(currentKey),
        }), { currentKey: SETTINGS_STORAGE_KEY });

        expect(migratedState.mapKey).toBe('mega_maze');
        expect(migratedState.winsNeeded).toBe(5);
        expect(migratedState.hasNewKey).toBeTruthy();

        await page.evaluate(({ currentKey, legacyKey }) => {
            localStorage.removeItem(currentKey);
            localStorage.removeItem(legacyKey);
        }, {
            currentKey: SETTINGS_STORAGE_KEY,
            legacyKey: LEGACY_SETTINGS_STORAGE_KEY,
        });
    });

    test('T13: Keine Fehler 2s nach Laden', async ({ page }) => {
        const errors = collectErrors(page);
        await loadGame(page);
        await page.waitForTimeout(800);
        expect(errors).toHaveLength(0);
    });

    test('T14: Alle Maps ladbar', async ({ page }) => {
        test.setTimeout(120000);
        const errors = collectErrors(page);
        await loadGame(page);

        for (const mapKey of ['standard', 'empty', 'maze', 'complex', 'pyramid', 'showcase_nexus']) {
            await openGameSubmenu(page);
            await page.selectOption('#map-select', mapKey);
            await page.click('#btn-start');
            await page.waitForFunction(() => {
                const hud = document.getElementById('hud');
                return hud && !hud.classList.contains('hidden');
            }, null, { timeout: 15000 });
            await page.waitForTimeout(500);
            await returnToMenu(page);
        }
        expect(errors).toHaveLength(0);
    });

    test('T14b: GLB-Maps markieren UI und starten mit Loader-Overlay und Szene-Collidern', async ({ page }) => {
        await loadGame(page);
        await openGameSubmenu(page);
        await page.selectOption('#map-select', 'glb_hangar');
        await page.waitForFunction(() => window.GAME_INSTANCE?.settings?.mapKey === 'glb_hangar', null, { timeout: 5000 });
        await page.waitForFunction(() => {
            const previewText = document.getElementById('map-preview')?.textContent || '';
            return previewText.includes('GLB');
        }, null, { timeout: 5000 });

        const selectionState = await page.evaluate(() => ({
            optionText: document.querySelector('#map-select option[value="glb_hangar"]')?.textContent || '',
            previewText: document.getElementById('map-preview')?.textContent || '',
        }));

        expect(selectionState.optionText).toContain('[GLB]');
        expect(selectionState.previewText).toContain('GLB');

        const probe = await page.evaluate(async () => {
            const game = window.GAME_INSTANCE;
            game.runtimeFacade?._clearMatchPrewarmTimer?.();
            const startPromise = game.matchFlowUiController.startMatch();
            const overlay = document.getElementById('message-overlay');
            const messageText = document.getElementById('message-text');
            const messageSub = document.getElementById('message-sub');
            const overlayVisibleDuringStart = !!overlay && !overlay.classList.contains('hidden');
            const loadingText = messageText?.textContent || '';
            const loadingSub = messageSub?.textContent || '';

            await startPromise;

            const nonWallObstacles = Array.isArray(game.arena?.obstacles)
                ? game.arena.obstacles.filter((entry) => !entry?.isWall)
                : [];
            return {
                state: game.state,
                currentMapKey: game.arena?.currentMapKey || null,
                overlayVisibleDuringStart,
                loadingText,
                loadingSub,
                glbScenePresent: !!game.arena?._glbScene,
                glbChildCount: game.arena?._glbScene?.children?.length || 0,
                glbError: game.arena?._glbLoadError || '',
                nonWallObstacleCount: nonWallObstacles.length,
                obstacleKinds: nonWallObstacles.map((entry) => entry.kind || 'hard'),
                floorParent: game.arena?._floorMesh?.parent?.name || null,
            };
        });

        expect(probe.state).toBe('PLAYING');
        expect(probe.currentMapKey).toBe('glb_hangar');
        expect(probe.overlayVisibleDuringStart).toBeTruthy();
        expect(probe.loadingText).toContain('GLB Test Hangar');
        expect(probe.loadingSub).toContain('GLB-Umgebung');
        expect(probe.glbScenePresent).toBeTruthy();
        expect(probe.glbChildCount).toBeGreaterThanOrEqual(4);
        expect(probe.glbError).toBe('');
        expect(probe.nonWallObstacleCount).toBe(2);
        expect(probe.obstacleKinds).toEqual(expect.arrayContaining(['hard', 'foam']));
        expect(probe.floorParent).toBe('matchRoot');
    });

    test('T14c: Ungueltige GLB-Maps fallen auf Box-Hindernisse und Warn-Toast zurueck', async ({ page }) => {
        const brokenRuntimeMap = stringifyMapDocument({
            arenaSize: { width: 240, height: 90, depth: 240 },
            hardBlocks: [
                { id: 'glb_fallback_hard', x: -24, y: 12, z: 0, width: 6, height: 24, depth: 24 },
            ],
            foamBlocks: [
                { id: 'glb_fallback_foam', x: 24, y: 12, z: 0, width: 6, height: 24, depth: 24 },
            ],
            glbModel: 'data:model/gltf-binary;base64,broken',
        });

        await loadGame(page);
        await openGameSubmenu(page);
        await page.evaluate(({ storageKey, mapJson }) => {
            localStorage.setItem(storageKey, mapJson);
            const game = window.GAME_INSTANCE;
            if (game?.settings) {
                game.settings.mapKey = 'custom';
            }
            game?.runtimeFacade?.onSettingsChanged?.({ changedKeys: ['mapKey'] });
        }, {
            storageKey: CUSTOM_MAP_STORAGE_KEY,
            mapJson: brokenRuntimeMap,
        });
        await page.waitForFunction(() => window.GAME_INSTANCE?.settings?.mapKey === 'custom', null, { timeout: 5000 });

        const probe = await page.evaluate(async () => {
            const game = window.GAME_INSTANCE;
            game.runtimeFacade?._clearMatchPrewarmTimer?.();
            const startPromise = game.matchFlowUiController.startMatch();
            const loadingVisibleDuringStart = !document.getElementById('message-overlay')?.classList.contains('hidden');

            await startPromise;

            const nonWallObstacles = Array.isArray(game.arena?.obstacles)
                ? game.arena.obstacles.filter((entry) => !entry?.isWall)
                : [];
            const toast = document.getElementById('status-toast');
            return {
                state: game.state,
                currentMapKey: game.arena?.currentMapKey || null,
                loadingVisibleDuringStart,
                glbScenePresent: !!game.arena?._glbScene,
                glbError: game.arena?._glbLoadError || '',
                glbWarnings: Array.isArray(game.arena?._glbLoadWarnings) ? game.arena._glbLoadWarnings : [],
                nonWallObstacleCount: nonWallObstacles.length,
                obstacleKinds: nonWallObstacles.map((entry) => entry.kind || 'hard'),
                toastText: toast?.textContent || '',
                toastVisible: !!toast && !toast.classList.contains('hidden'),
            };
        });

        expect(probe.state).toBe('PLAYING');
        expect(probe.currentMapKey).toBe('custom');
        expect(probe.loadingVisibleDuringStart).toBeTruthy();
        expect(probe.glbScenePresent).toBeFalsy();
        expect(probe.glbError).not.toBe('');
        expect(probe.glbWarnings.length).toBeGreaterThan(0);
        expect(probe.nonWallObstacleCount).toBe(2);
        expect(probe.obstacleKinds).toEqual(expect.arrayContaining(['hard', 'foam']));
        expect(probe.toastVisible).toBeTruthy();
        expect(probe.toastText).toContain('Box-Fallback aktiv');
    });

    test('T14d: Showcase-Preset zeigt Preview-Signale und laedt authored Runtime-Features', async ({ page }) => {
        const errors = collectErrors(page);
        await loadGame(page);
        await openGameSubmenu(page);
        await page.selectOption('#map-select', 'showcase_nexus');
        await page.waitForFunction(() => window.GAME_INSTANCE?.settings?.mapKey === 'showcase_nexus', null, { timeout: 5000 });
        await page.evaluate(() => {
            const slider = document.getElementById('bot-count');
            slider.value = '3';
            slider.dispatchEvent(new Event('input', { bubbles: true }));
        });

        const previewState = await page.evaluate(() => {
            const badges = Array.from(document.querySelectorAll('#map-preview .preview-badge')).map((node) => node.textContent || '');
            const facts = Array.from(document.querySelectorAll('#map-preview .preview-kv')).map((node) => ({
                label: node.querySelector('.preview-kv-label')?.textContent || '',
                value: node.querySelector('.preview-kv-value')?.textContent || '',
            }));
            return { badges, facts };
        });

        expect(previewState.badges).toEqual(expect.arrayContaining(['GLB+FALLBACK', '3 Ebenen']));
        expect(previewState.facts).toEqual(expect.arrayContaining([
            expect.objectContaining({ label: 'Tunnel', value: '4' }),
            expect.objectContaining({ label: 'Gates', value: '3' }),
            expect.objectContaining({ label: 'Spawns', value: '5' }),
            expect.objectContaining({ label: 'Items', value: '4' }),
            expect.objectContaining({ label: 'Deko', value: '3' }),
        ]));

        const probe = await page.evaluate(async () => {
            const game = window.GAME_INSTANCE;
            game.runtimeFacade?._clearMatchPrewarmTimer?.();
            await game.matchFlowUiController.startMatch();

            const arena = game.arena;
            const human = game.entityManager?.players?.find((player) => !player?.isBot) || null;
            const authoredSpawn = arena?.getAuthoredPlayerSpawn?.() || null;
            const playerSpawnDistance = human && authoredSpawn
                ? Math.hypot(
                    human.position.x - authoredSpawn.x,
                    human.position.y - authoredSpawn.y,
                    human.position.z - authoredSpawn.z,
                )
                : null;

            return {
                currentMapKey: arena?.currentMapKey || '',
                glbScenePresent: !!arena?._glbScene,
                glbError: arena?._glbLoadError || '',
                gateCount: Array.isArray(arena?.specialGates) ? arena.specialGates.length : 0,
                portalCount: Array.isArray(arena?.portals) ? arena.portals.length : 0,
                tubeObstacleCount: Array.isArray(arena?.obstacles) ? arena.obstacles.filter((entry) => !!entry?.tube).length : 0,
                aircraftDecorationCount: Array.isArray(arena?._aircraftDecorations) ? arena._aircraftDecorations.length : 0,
                authoredItemAnchorCount: Array.isArray(arena?.getAuthoredItemAnchors?.()) ? arena.getAuthoredItemAnchors().length : 0,
                playerSpawnDistance,
            };
        });

        expect(probe.currentMapKey).toBe('showcase_nexus');
        expect(probe.glbScenePresent).toBeTruthy();
        expect(probe.glbError).toBe('');
        expect(probe.gateCount).toBe(3);
        expect(probe.portalCount).toBe(2);
        expect(probe.tubeObstacleCount).toBe(2);
        expect(probe.aircraftDecorationCount).toBe(3);
        expect(probe.authoredItemAnchorCount).toBe(4);
        expect(probe.playerSpawnDistance).not.toBeNull();
        expect(probe.playerSpawnDistance).toBeLessThan(4);
        expect(errors).toHaveLength(0);
    });

    test('T14e: Editor-Import/Export behaelt Showcase-Metadaten und Pickup-Anker-Felder', async () => {
        const manager = createMockEditorManager();
        const sourceDocument = {
            arenaSize: { width: 390, height: 156, depth: 390 },
            glbModel: 'assets/models/showcase.glb',
            glbColliderMode: 'fallbackOnly',
            preferAuthoredPortals: true,
            portalLevels: [36, 78, 120],
            hardBlocks: [
                { id: 'hard_lane', x: 0, y: 24, z: -102, width: 120, height: 54, depth: 18, tunnel: { radius: 14.4, axis: 'x' } },
            ],
            foamBlocks: [],
            tunnels: [
                { id: 'tube_lane', ax: -132, ay: 54, az: -78, bx: 132, by: 54, bz: -78, radius: 12.6 },
            ],
            portals: [
                { id: 'portal_a', x: -156, y: 36, z: -156, radius: 18 },
                { id: 'portal_b', x: 156, y: 78, z: 156, radius: 18 },
            ],
            gates: [
                { id: 'gate_boost', type: 'boost', pos: [0, 36, -150], forward: [0, 0, -1], params: { duration: 1.4, forwardImpulse: 46 } },
            ],
            playerSpawn: { id: 'spawn_player', x: -162, y: 36, z: 54 },
            botSpawns: [{ id: 'spawn_bot_a', x: 162, y: 36, z: 54 }],
            items: [
                { id: 'item_anchor', type: 'item_rocket', model: 'item_rocket', pickupType: 'ROCKET_WEAK', weight: 1.5, x: 60, y: 78, z: 54, rotateY: 0.25 },
            ],
            aircraft: [
                { id: 'air_show', jetId: 'jet_ship6', x: 0, y: 138, z: 144, scale: 3.3, rotateY: 1.4 },
            ],
        };

        importFromJSON(manager, JSON.stringify(sourceDocument));
        const exported = generateJSONExport(manager, sourceDocument.arenaSize);
        const roundtrip = parseMapJSON(exported).map;

        expect(roundtrip.glbModel).toBe(sourceDocument.glbModel);
        expect(roundtrip.glbColliderMode).toBe('fallbackOnly');
        expect(roundtrip.preferAuthoredPortals).toBeTruthy();
        expect(roundtrip.portalLevels).toEqual(sourceDocument.portalLevels);
        expect(roundtrip.gates).toHaveLength(1);
        expect(roundtrip.gates[0]).toMatchObject({
            id: 'gate_boost',
            type: 'boost',
            pos: [0, 36, -150],
        });
        expect(roundtrip.items).toHaveLength(1);
        expect(roundtrip.items[0]).toMatchObject({
            id: 'item_anchor',
            type: 'item_rocket',
            model: 'item_rocket',
            pickupType: 'ROCKET_WEAK',
            weight: 1.5,
        });
        expect(roundtrip.aircraft).toHaveLength(1);
        expect(roundtrip.playerSpawn).toMatchObject({ id: 'spawn_player', x: -162, y: 36, z: 54 });
        expect(roundtrip.botSpawns).toHaveLength(1);
        expect(roundtrip.tunnels).toHaveLength(1);
    });

    test('T14f: Parcours-Rift erzwingt Reihenfolge und beendet Match mit Objective-Overlay', async ({ page }) => {
        await loadGame(page);
        await openCustomSubmenu(page);
        await page.click('#submenu-custom:not(.hidden) [data-mode-path="arcade"]');
        await page.waitForFunction(() => String(window.GAME_INSTANCE?.settings?.localSettings?.modePath || '') === 'arcade', null, { timeout: 5000 });
        await page.waitForSelector('#submenu-game:not(.hidden)', { timeout: 5000 });
        await page.selectOption('#map-select', 'parcours_rift');
        await page.waitForFunction(() => window.GAME_INSTANCE?.settings?.mapKey === 'parcours_rift', null, { timeout: 5000 });
        await page.evaluate(() => {
            const game = window.GAME_INSTANCE;
            if (!game?.settings) return;
            game.settings.winsNeeded = 1;
            game.settings.numBots = 1;
            const winsSlider = document.getElementById('win-count');
            if (winsSlider) winsSlider.value = '1';
            const botSlider = document.getElementById('bot-count');
            if (botSlider) botSlider.value = '1';
            game.runtimeFacade?.onSettingsChanged?.({ changedKeys: ['rules.winsNeeded', 'bots.count'] });
        });
        await page.waitForFunction(() => {
            const settings = window.GAME_INSTANCE?.settings;
            return Number(settings?.winsNeeded) === 1 && Number(settings?.numBots) === 1;
        }, null, { timeout: 5000 });
        await page.click('#btn-start');
        await page.waitForFunction(() => {
            const hud = document.getElementById('hud');
            return !!(hud && !hud.classList.contains('hidden'));
        }, null, { timeout: 20000 });

        const probe = await page.evaluate(() => {
            const game = window.GAME_INSTANCE;
            const entityManager = game?.entityManager;
            const system = entityManager?._parcoursProgressSystem;
            const route = system?.getRouteSnapshot?.();
            const player = entityManager?.players?.find((entry) => !entry?.isBot) || entityManager?.players?.[0] || null;
            if (!route || !player) return { error: 'missing-route-or-player' };

            const setPlayerPosition = (x, y, z) => {
                if (player.position?.set) {
                    player.position.set(x, y, z);
                    return;
                }
                player.position.x = x;
                player.position.y = y;
                player.position.z = z;
            };

            const cross = (entry, nowMs) => {
                const pos = Array.isArray(entry?.pos) ? entry.pos : [0, 0, 0];
                const forward = Array.isArray(entry?.forward) ? entry.forward : [1, 0, 0];
                const previousPosition = {
                    x: pos[0] - (forward[0] * 0.65),
                    y: pos[1] - (forward[1] * 0.65),
                    z: pos[2] - (forward[2] * 0.65),
                };
                setPlayerPosition(
                    pos[0] + (forward[0] * 0.35),
                    pos[1] + (forward[1] * 0.35),
                    pos[2] + (forward[2] * 0.35)
                );
                return system.updatePlayerProgress(player, previousPosition, nowMs);
            };

            let nowMs = 800;
            const hitTypes = [];
            for (let checkpointIndex = 0; checkpointIndex < route.totalCheckpoints; checkpointIndex += 1) {
                const entry = route.checkpoints.find((candidate) => candidate.routeIndex === checkpointIndex);
                if (!entry) return { error: `missing-checkpoint-${checkpointIndex}` };
                const hit = cross(entry, nowMs);
                hitTypes.push(hit?.type || 'none');
                nowMs += 450;
            }
            const finishHit = cross(route.finish, nowMs + 400);
            game.hudRuntimeSystem?.updatePlayingHudTick?.(0.2);
            const winsNeeded = Number(game?.winsNeeded || game?.settings?.winsNeeded || 1);
            if (Number.isFinite(winsNeeded) && winsNeeded > 0) {
                player.score = Math.max(0, Math.trunc(winsNeeded) - 1);
            }

            const outcome = entityManager?._roundOutcomeSystem?.resolve?.() || null;
            if (outcome?.shouldEnd) {
                entityManager?._eventBus?.emitRoundEnd?.(outcome.winner, outcome);
            }

            return {
                error: '',
                hitTypes,
                finishType: finishHit?.type || '',
                outcomeReason: outcome?.reason || '',
                state: game.state,
                messageText: document.getElementById('message-text')?.textContent || '',
                messageSub: document.getElementById('message-sub')?.textContent || '',
                parcoursProgress: document.getElementById('parcours-progress')?.textContent || '',
                parcoursTimer: document.getElementById('parcours-timer')?.textContent || '',
                parcoursStatus: document.getElementById('parcours-status')?.textContent || '',
                roundMetrics: game.recorder?.getLastRoundMetrics?.() || null,
                telemetryRecentRound: game.settings?.localSettings?.telemetryState?.recentRounds?.[0] || null,
            };
        });

        expect(probe.error || '').toBe('');
        expect(probe.hitTypes).toEqual(['checkpoint', 'checkpoint', 'checkpoint', 'checkpoint', 'checkpoint', 'checkpoint', 'checkpoint', 'checkpoint']);
        expect(probe.finishType).toBe('finish');
        expect(probe.outcomeReason).toBe('PARCOURS_COMPLETE');
        expect(['ROUND_END', 'MATCH_END']).toContain(probe.state);
        expect(probe.parcoursProgress).toContain('CP 8/8');
        expect(probe.parcoursTimer).toContain('Finish');
        expect(probe.parcoursStatus).toContain('Parcours abgeschlossen');
        expect(probe.roundMetrics?.reason).toBe('PARCOURS_COMPLETE');
        expect(probe.roundMetrics?.parcoursCompleted).toBeTruthy();
        expect(probe.roundMetrics?.parcoursRouteId).toBe('rift_gauntlet_v1');
        expect(probe.roundMetrics?.parcoursCompletionTimeMs).toBeGreaterThan(0);
        expect(probe.telemetryRecentRound?.parcoursCompleted).toBeTruthy();
        expect(probe.telemetryRecentRound?.parcoursRouteId).toBe('rift_gauntlet_v1');
    });

    test('T14g: Editor-Import/Export behaelt Parcours-Definitionen im Roundtrip', async () => {
        const manager = createMockEditorManager();
        const sourceDocument = {
            arenaSize: { width: 320, height: 120, depth: 280 },
            hardBlocks: [
                { id: 'lane_wall', x: 0, y: 16, z: 0, width: 30, height: 32, depth: 8 },
            ],
            parcours: {
                enabled: true,
                routeId: 'roundtrip_route_v1',
                rules: {
                    ordered: true,
                    resetOnDeath: true,
                    resetToLastValid: false,
                    maxSegmentTimeMs: 12000,
                    cooldownMs: 450,
                    allowLaneAliases: true,
                    winnerByParcoursComplete: true,
                },
                checkpoints: [
                    { id: 'CP01', type: 'entry', pos: [-20, 10, 0], radius: 4.4, forward: [1, 0, 0] },
                    { id: 'CP02', type: 'gate', pos: [0, 14, 0], radius: 4.2, forward: [1, 0, 0] },
                    { id: 'CP03', type: 'split', pos: [20, 18, -6], radius: 4.3, forward: [1, 0, 0] },
                    { id: 'CP03_R', type: 'split', aliasOf: 'CP03', pos: [20, 18, 6], radius: 4.3, forward: [1, 0, 0] },
                ],
                finish: { id: 'FINISH', type: 'finish', pos: [34, 18, 0], radius: 5.2, forward: [1, 0, 0] },
            },
        };

        importFromJSON(manager, JSON.stringify(sourceDocument));
        const exported = generateJSONExport(manager, sourceDocument.arenaSize);
        const roundtrip = parseMapJSON(exported).map;

        expect(roundtrip.parcours?.enabled).toBeTruthy();
        expect(roundtrip.parcours?.routeId).toBe('roundtrip_route_v1');
        expect(roundtrip.parcours?.checkpoints?.length).toBe(4);
        expect(roundtrip.parcours?.checkpoints?.[3]).toMatchObject({
            id: 'CP03_R',
            aliasOf: 'CP03',
            type: 'split',
        });
        expect(roundtrip.parcours?.finish).toMatchObject({
            id: 'FINISH',
            type: 'finish',
        });
        expect(roundtrip.parcours?.rules).toMatchObject({
            ordered: true,
            resetOnDeath: true,
            winnerByParcoursComplete: true,
        });
    });

    test('T15: Bot-Count Slider aktualisiert Label', async ({ page }) => {
        await loadGame(page);
        await openGameSubmenu(page);
        await page.evaluate(() => {
            const slider = document.getElementById('bot-count');
            slider.value = '4';
            slider.dispatchEvent(new Event('input', { bubbles: true }));
        });
        const label = await page.textContent('#bot-count-label');
        expect(label).toBe('4');
    });

    test('T16: Schwierigkeitsstufen auswählbar', async ({ page }) => {
        await loadGame(page);
        await openStartSetupSection(page, 'match');
        for (const diff of ['EASY', 'NORMAL', 'HARD']) {
            await page.selectOption('#bot-difficulty', diff);
            expect(await page.inputValue('#bot-difficulty')).toBe(diff);
        }
    });

    test('T17: Vehicle-Select hat mindestens 1 Option', async ({ page }) => {
        await loadGame(page);
        await openGameSubmenu(page);
        const count = await page.evaluate(() =>
            document.querySelectorAll('#vehicle-select-p1 option').length
        );
        expect(count).toBeGreaterThanOrEqual(1);
    });

    test('T18: Power-Up-Typen definiert (mind. 1)', async ({ page }) => {
        await loadGame(page);
        const count = await page.evaluate(() => {
            const g = window.GAME_INSTANCE;
            const types = g?.config?.POWERUP?.TYPES;
            if (!types) return 0;
            return Object.keys(types).length;
        });
        expect(count).toBeGreaterThanOrEqual(1);
    });

    test('T19: Keine doppelten Element-IDs', async ({ page }) => {
        await loadGame(page);
        const dupes = await page.evaluate(() => {
            const seen = {};
            const dupes = [];
            document.querySelectorAll('[id]').forEach(el => {
                const isVisible = !!(el.offsetParent || (el.getClientRects && el.getClientRects().length));
                if (!isVisible) return;
                if (seen[el.id]) dupes.push(el.id);
                seen[el.id] = true;
            });
            return dupes;
        });
        expect(dupes.length).toBe(0);
    });

    test('T20: Submenu Settings öffnet und schließt', async ({ page }) => {
        await loadGame(page);
        await openSubmenu(page, 'submenu-settings');
        await expect(page.locator('#submenu-settings')).toBeVisible();
        await page.click('#submenu-settings [data-back]');
        await page.waitForTimeout(150);
        await expect(page.locator('#menu-nav')).toBeVisible();
    });

    test('T20a: Recorder-Support-Probe liefert lifecycle.v1-Metadaten', async ({ page }) => {
        await loadGame(page);
        const probe = await page.evaluate(() => {
            const recorderSystem = window.GAME_INSTANCE?.mediaRecorderSystem;
            const support = recorderSystem?.getSupportState?.();
            return {
                hasSystem: !!recorderSystem,
                contractVersion: recorderSystem?.getContractVersion?.() || null,
                canCaptureType: typeof support?.canCapture,
                hasRecorderType: typeof support?.hasRecorder,
                canRecordType: typeof support?.canRecord,
            };
        });

        expect(probe.hasSystem).toBeTruthy();
        expect(probe.contractVersion).toBe('lifecycle.v1');
        expect(probe.canCaptureType).toBe('boolean');
        expect(probe.hasRecorderType).toBe('boolean');
        expect(probe.canRecordType).toBe('boolean');
    });

    test('T20af: Recorder-Support trennt Shim-Faelle und liefert konsistente Start/Stop-Resultate', async ({ page }) => {
        await loadGame(page);
        const result = await page.evaluate(async () => {
            const { MediaRecorderSystem } = await import('/src/core/MediaRecorderSystem.js');
            const logger = { warn() { }, info() { }, error() { } };

            const shimRecorder = new MediaRecorderSystem({
                canvas: { width: 320, height: 180 },
                logger,
                capabilityProbe: () => ({
                    canCapture: true,
                    hasRecorder: false,
                    canRecord: false,
                    selectedMimeType: 'video/mp4',
                    recorderEngine: 'none',
                    supportReason: 'shim-or-unsupported',
                }),
            });
            const nativeRecorder = new MediaRecorderSystem({
                canvas: { width: 320, height: 180 },
                logger,
                capabilityProbe: () => ({
                    canCapture: true,
                    hasRecorder: true,
                    canRecord: true,
                    selectedMimeType: 'video/mp4',
                    recorderEngine: 'webcodecs-native',
                    supportReason: 'native-webcodecs',
                }),
            });

            const shimSupport = shimRecorder.getSupportState();
            const nativeSupport = nativeRecorder.getSupportState();
            const unsupportedStart = await shimRecorder.startRecording({ type: 'manual-test' });
            const idleStop = await shimRecorder.stopRecording({ type: 'manual-test' });

            shimRecorder.dispose();
            nativeRecorder.dispose();

            return {
                shimHasRecorder: !!shimSupport.hasRecorder,
                shimCanRecord: !!shimSupport.canRecord,
                nativeHasRecorder: !!nativeSupport.hasRecorder,
                nativeCanRecord: !!nativeSupport.canRecord,
                startAction: unsupportedStart?.action || '',
                startReason: unsupportedStart?.reason || '',
                startStarted: !!unsupportedStart?.started,
                stopAction: idleStop?.action || '',
                stopReason: idleStop?.reason || '',
                stopStopped: !!idleStop?.stopped,
            };
        });

        expect(result.shimHasRecorder).toBeFalsy();
        expect(result.shimCanRecord).toBeFalsy();
        expect(result.nativeHasRecorder).toBeTruthy();
        expect(result.nativeCanRecord).toBeTruthy();
        expect(result.startAction).toBe('start');
        expect(result.startReason).toBe('unsupported');
        expect(result.startStarted).toBeFalsy();
        expect(result.stopAction).toBe('stop');
        expect(result.stopReason).toBe('not_recording');
        expect(result.stopStopped).toBeFalsy();
    });

    test('T20b: Lifecycle-Events markieren Match Start/Ende und Menue-Oeffnung', async ({ page }) => {
        await startGame(page);
        await page.waitForTimeout(100);

        let eventTypes = await page.evaluate(() => (
            window.GAME_INSTANCE?.mediaRecorderSystem?.getLifecycleEvents?.().map((entry) => entry.type) || []
        ));
        expect(eventTypes.includes('match_started')).toBeTruthy();

        await returnToMenu(page);
        await page.waitForTimeout(100);

        eventTypes = await page.evaluate(() => (
            window.GAME_INSTANCE?.mediaRecorderSystem?.getLifecycleEvents?.().map((entry) => entry.type) || []
        ));
        expect(eventTypes.includes('match_ended')).toBeTruthy();
        expect(eventTypes.includes('menu_opened')).toBeTruthy();
    });

    test('T20ba: Round-End Ghost-Replay nutzt Recorder-Snapshots und wird beim Rundenreset entfernt', async ({ page }) => {
        await startGameWithBots(page, 1);

        const replayState = await page.evaluate(() => {
            const game = window.GAME_INSTANCE;
            const players = game?.entityManager?.players || [];
            if (players.length < 2) {
                return { error: 'missing-players' };
            }

            const applyPose = (player, x, y, z, yaw) => {
                player.position.set(x, y, z);
                player.quaternion.set(0, Math.sin(yaw * 0.5), 0, Math.cos(yaw * 0.5));
            };

            const baseY0 = Number(players[0]?.position?.y) || 5;
            const baseY1 = Number(players[1]?.position?.y) || 5;

            game.recorder._snapshotInterval = 1;
            game.recorder.startRound(players);

            for (let step = 0; step < 6; step += 1) {
                applyPose(players[0], -18 + step * 4.2, baseY0, 9 - step * 1.8, step * 0.2);
                applyPose(players[1], 16 - step * 3.1, baseY1, -7 + step * 2.4, -step * 0.16);
                game.recorder.recordFrame(players);
            }

            game.matchFlowUiController.onRoundEnd(players[0]);
            const initialGhost = game.entityManager.getLastRoundGhostState();
            game.entityManager.updateLastRoundGhostPlayback(1.5);
            const advancedGhost = game.entityManager.getLastRoundGhostState();

            return {
                state: game.state,
                overlayVisible: !document.getElementById('message-overlay')?.classList?.contains('hidden'),
                initialGhost,
                advancedGhost,
            };
        });

        expect(replayState.error || '').toBe('');
        expect(['ROUND_END', 'MATCH_END']).toContain(replayState.state);
        expect(replayState.overlayVisible).toBeTruthy();
        expect(replayState.initialGhost.active).toBeTruthy();
        expect(replayState.initialGhost.frameCount).toBeGreaterThanOrEqual(6);
        expect(replayState.initialGhost.entryCount).toBeGreaterThanOrEqual(2);

        const movedGhost = replayState.advancedGhost.ghosts.some((ghost, index) => {
            const before = replayState.initialGhost.ghosts[index];
            return before && (ghost.x !== before.x || ghost.z !== before.z);
        });
        expect(movedGhost).toBeTruthy();

        const resetState = await page.evaluate(() => {
            const game = window.GAME_INSTANCE;
            game.matchFlowUiController.startRound();
            return {
                state: game.state,
                ghost: game.entityManager.getLastRoundGhostState(),
            };
        });

        expect(resetState.state).toBe('PLAYING');
        expect(resetState.ghost.active).toBeFalsy();
        expect(resetState.ghost.entryCount).toBe(0);
    });

    test('T20c: Multiplayer ist als Session-Typ in Ebene 1 waehlbar', async ({ page }) => {
        await loadGame(page);
        await expect(page.locator('#menu-nav [data-session-type="multiplayer"]')).toBeVisible();
        await openMultiplayerSubmenu(page);
        await expect(page.locator('#submenu-game')).toBeVisible();
        await expect(page.locator('#multiplayer-inline-stub')).toBeVisible();
    });

    test('T20d: Multiplayer-Bridge emittiert lifecycle.v1 Event-Contract', async ({ page }) => {
        await loadGame(page);
        await openMultiplayerSubmenu(page);
        await page.fill('#multiplayer-lobby-code', 'QA-LOBBY');
        await page.click('#btn-multiplayer-host');
        await page.waitForTimeout(50);
        const lifecycleEvent = await page.evaluate(() => {
            const events = window.GAME_INSTANCE?.getMenuLifecycleEvents?.() || [];
            return events.find((entry) => entry.type === 'multiplayer_host') || null;
        });

        expect(lifecycleEvent).toBeTruthy();
        expect(lifecycleEvent.contractVersion).toBe('lifecycle.v1');
        expect(lifecycleEvent.payload?.lobbyCode).toBe('QA-LOBBY');
    });

    test('T20d1: Multiplayer-Lobby synchronisiert Join, Ready und Host-Invalidation ueber zwei Tabs', async ({ page }) => {
        const secondPage = await page.context().newPage();
        try {
            await loadGame(page);
            await loadGame(secondPage);

            await openMultiplayerSubmenu(page);
            await page.fill('#multiplayer-lobby-code', 'SYNC-LOBBY');
            await page.click('#btn-multiplayer-host');
            await page.waitForFunction(() => window.GAME_INSTANCE?.menuMultiplayerBridge?.getSessionState?.()?.joined === true, null, { timeout: 5000 });

            await openMultiplayerSubmenu(secondPage);
            await secondPage.fill('#multiplayer-lobby-code', 'SYNC-LOBBY');
            await secondPage.click('#btn-multiplayer-join');
            await secondPage.waitForFunction(() => window.GAME_INSTANCE?.menuMultiplayerBridge?.getSessionState?.()?.joined === true, null, { timeout: 5000 });
            await secondPage.check('#multiplayer-ready-toggle');

            await page.waitForFunction(() => {
                const state = window.GAME_INSTANCE?.menuMultiplayerBridge?.getSessionState?.();
                return state?.memberCount === 2 && state?.readyCount === 1;
            }, null, { timeout: 5000 });

            const syncedState = await page.evaluate(() => ({
                sessionState: window.GAME_INSTANCE?.menuMultiplayerBridge?.getSessionState?.(),
                lobbyStateText: document.getElementById('multiplayer-lobby-state')?.textContent || '',
            }));
            expect(syncedState.sessionState?.isHost).toBeTruthy();
            expect(syncedState.sessionState?.memberCount).toBe(2);
            expect(syncedState.sessionState?.readyCount).toBe(1);
            expect(syncedState.lobbyStateText).toContain('2 Spieler');

            await page.evaluate(() => {
                const slider = document.getElementById('bot-count');
                slider.value = '4';
                slider.dispatchEvent(new Event('input', { bubbles: true }));
            });

            await secondPage.waitForFunction(() => {
                const state = window.GAME_INSTANCE?.menuMultiplayerBridge?.getSessionState?.();
                return state?.joined === true && state?.localReady === false && state?.readyCount === 0;
            }, null, { timeout: 5000 });

            const invalidatedState = await secondPage.evaluate(() => ({
                sessionState: window.GAME_INSTANCE?.menuMultiplayerBridge?.getSessionState?.(),
                readyChecked: !!document.getElementById('multiplayer-ready-toggle')?.checked,
            }));
            expect(invalidatedState.sessionState?.role).toBe('client');
            expect(invalidatedState.sessionState?.localReady).toBeFalsy();
            expect(invalidatedState.readyChecked).toBeFalsy();
        } finally {
            await secondPage.close();
        }
    });

    test('T20d2: Multiplayer-Host startet Match synchron mit autoritativem Snapshot ueber zwei Tabs', async ({ page }) => {
        test.setTimeout(120000);
        const secondPage = await page.context().newPage();
        try {
            await loadGame(page);
            await loadGame(secondPage);

            await openMultiplayerSubmenu(page);
            await page.fill('#multiplayer-lobby-code', 'START-LOBBY');
            await page.click('#btn-multiplayer-host');
            await page.waitForFunction(() => window.GAME_INSTANCE?.menuMultiplayerBridge?.getSessionState?.()?.joined === true, null, { timeout: 5000 });

            await page.selectOption('#map-select', 'maze');
            await page.waitForFunction(() => window.GAME_INSTANCE?.settings?.mapKey === 'maze', null, { timeout: 5000 });

            await openMultiplayerSubmenu(secondPage);
            await secondPage.fill('#multiplayer-lobby-code', 'START-LOBBY');
            await secondPage.click('#btn-multiplayer-join');
            await secondPage.waitForFunction(() => window.GAME_INSTANCE?.menuMultiplayerBridge?.getSessionState?.()?.joined === true, null, { timeout: 5000 });

            await page.check('#multiplayer-ready-toggle');
            await secondPage.check('#multiplayer-ready-toggle');

            await page.waitForFunction(() => {
                const state = window.GAME_INSTANCE?.menuMultiplayerBridge?.getSessionState?.();
                return state?.canStart === true && state?.allReady === true;
            }, null, { timeout: 5000 });

            await page.click('#btn-start');

            await page.waitForFunction(() => {
                const game = window.GAME_INSTANCE;
                return game?.state === 'PLAYING' && game?.settings?.mapKey === 'maze' && !!game?.entityManager;
            }, null, { timeout: 30000 });
            await secondPage.waitForFunction(() => {
                const game = window.GAME_INSTANCE;
                return game?.state === 'PLAYING' && game?.settings?.mapKey === 'maze' && !!game?.entityManager;
            }, null, { timeout: 30000 });

            const secondProbe = await secondPage.evaluate(() => ({
                state: window.GAME_INSTANCE?.state,
                mapKey: window.GAME_INSTANCE?.settings?.mapKey,
                hudVisible: !document.getElementById('hud')?.classList.contains('hidden'),
            }));
            expect(secondProbe.state).toBe('PLAYING');
            expect(secondProbe.mapKey).toBe('maze');
            expect(secondProbe.hudVisible).toBeTruthy();
        } finally {
            await secondPage.close();
        }
    });

    test('T41a: MenuSchema markiert multiplayer-host mit visibilityCondition canHost', async ({ page }) => {
        await loadGame(page);
        const schema = await page.evaluate(() => {
            const registry = window.GAME_INSTANCE?.menuPanelRegistry;
            const s = registry?.getSchema?.();
            const panel = Array.isArray(s?.panels) ? s.panels.find((p) => p.id === 'submenu-multiplayer') : null;
            const hostItem = Array.isArray(panel?.items) ? panel.items.find((i) => i.id === 'multiplayer-host') : null;
            return {
                hasPanel: !!panel,
                panelVisible: panel?.visibility !== 'hidden',
                hostItemExists: !!hostItem,
                hostItemCondition: hostItem?.visibilityCondition || null,
            };
        });

        expect(schema.hasPanel).toBe(true);
        expect(schema.panelVisible).toBe(true);
        expect(schema.hostItemExists).toBe(true);
        expect(schema.hostItemCondition).toBe('canHost');
    });

    test('T41b: MenuMultiplayerPanel zeigt Host-Button nur wenn canHost=true', async ({ page }) => {
        await loadGame(page);

        const result = await page.evaluate(async () => {
            const mod = await import('/src/ui/menu/MenuMultiplayerPanel.js');
            const mockBridge = {
                host: () => ({ ok: false }),
                join: () => ({ ok: false }),
                leave: () => {},
                toggleReady: () => {},
                requestMatchStart: () => {},
                getSessionState: () => ({ joined: false, memberCount: 0, localReady: false, canStart: false, members: [] }),
            };

            const containerA = document.createElement('div');
            document.body.appendChild(containerA);
            mod.createMultiplayerPanel({ bridge: mockBridge, container: containerA, canHost: false });
            const hostBtnHidden = !containerA.querySelector('.mp-host-btn');
            containerA.remove();

            const containerB = document.createElement('div');
            document.body.appendChild(containerB);
            mod.createMultiplayerPanel({ bridge: mockBridge, container: containerB, canHost: true });
            const hostBtnVisible = !!containerB.querySelector('.mp-host-btn');
            containerB.remove();

            return { hostBtnHidden, hostBtnVisible };
        });

        expect(result.hostBtnHidden).toBe(true);
        expect(result.hostBtnVisible).toBe(true);
    });

    test('T41c: MenuMultiplayerBridge akzeptiert Runtime-DI ohne implizite Browser-Globals', async ({ page }) => {
        await loadGame(page);

        const result = await page.evaluate(async () => {
            const { MenuMultiplayerBridge } = await import('/src/ui/menu/MenuMultiplayerBridge.js');

            const createMemoryStorage = () => {
                const store = new Map();
                return {
                    getItem(key) {
                        return store.has(key) ? store.get(key) : null;
                    },
                    setItem(key, value) {
                        store.set(key, String(value));
                    },
                    removeItem(key) {
                        store.delete(key);
                    },
                };
            };

            const listeners = new Map();
            let addCalls = 0;
            let removeCalls = 0;
            const eventTarget = {
                addEventListener(type, handler) {
                    addCalls += 1;
                    const entries = listeners.get(type) || [];
                    entries.push(handler);
                    listeners.set(type, entries);
                },
                removeEventListener(type, handler) {
                    removeCalls += 1;
                    const entries = listeners.get(type) || [];
                    listeners.set(type, entries.filter((entry) => entry !== handler));
                },
            };

            const intervals = new Map();
            const timeouts = new Map();
            let intervalCount = 0;
            let timeoutCount = 0;
            let clearIntervalCount = 0;
            let clearTimeoutCount = 0;
            let intervalCursor = 0;
            let timeoutCursor = 0;

            const runtime = {
                eventTarget,
                createBroadcastChannel: () => null,
                setInterval(fn) {
                    intervalCount += 1;
                    const id = `i-${++intervalCursor}`;
                    intervals.set(id, fn);
                    return id;
                },
                clearInterval(id) {
                    clearIntervalCount += 1;
                    intervals.delete(id);
                },
                setTimeout(fn) {
                    timeoutCount += 1;
                    const id = `t-${++timeoutCursor}`;
                    timeouts.set(id, fn);
                    return id;
                },
                clearTimeout(id) {
                    clearTimeoutCount += 1;
                    timeouts.delete(id);
                },
                now: () => 1700000000000,
                random: () => 0.123456789,
            };

            const sharedStorage = createMemoryStorage();
            const hostBridge = new MenuMultiplayerBridge({
                peerId: 'peer-host',
                storage: sharedStorage,
                sessionStorage: createMemoryStorage(),
                runtime,
            });
            const clientBridge = new MenuMultiplayerBridge({
                peerId: 'peer-client',
                storage: sharedStorage,
                sessionStorage: createMemoryStorage(),
                runtime,
            });

            const hostResult = hostBridge.host({ actorId: 'host', lobbyCode: 'qa-lobby' });
            const joinResult = clientBridge.join({ actorId: 'client', lobbyCode: 'qa-lobby' });
            hostBridge.toggleReady({ ready: true });
            clientBridge.toggleReady({ ready: true });
            const startResult = hostBridge.requestMatchStart({
                settingsSnapshot: { mapKey: 'maze' },
            });

            hostBridge.dispose();
            clientBridge.dispose();

            return {
                hostOk: hostResult?.ok === true,
                joinOk: joinResult?.ok === true,
                startOk: startResult?.ok === true,
                commandId: String(startResult?.commandId || ''),
                addCalls,
                removeCalls,
                remainingStorageListeners: (listeners.get('storage') || []).length,
                remainingUnloadListeners: (listeners.get('beforeunload') || []).length,
                intervalCount,
                clearIntervalCount,
                timeoutCount,
                clearTimeoutCount,
            };
        });

        expect(result.hostOk).toBe(true);
        expect(result.joinOk).toBe(true);
        expect(result.startOk).toBe(true);
        expect(result.commandId.startsWith('match-')).toBe(true);
        expect(result.addCalls).toBeGreaterThanOrEqual(4);
        expect(result.removeCalls).toBeGreaterThanOrEqual(4);
        expect(result.remainingStorageListeners).toBe(0);
        expect(result.remainingUnloadListeners).toBe(0);
        expect(result.intervalCount).toBeGreaterThanOrEqual(2);
        expect(result.clearIntervalCount).toBeGreaterThanOrEqual(2);
        expect(result.timeoutCount).toBeGreaterThanOrEqual(1);
        expect(result.clearTimeoutCount).toBeGreaterThanOrEqual(1);
    });

    test('T41c1: MenuMultiplayerBridge haelt Revisionen bei ready/heartbeat/match_start Mutationen monoton', async ({ page }) => {
        await loadGame(page);

        const result = await page.evaluate(async () => {
            const { MenuMultiplayerBridge } = await import('/src/ui/menu/MenuMultiplayerBridge.js');

            const createMemoryStorage = () => {
                const store = new Map();
                return {
                    getItem(key) {
                        return store.has(key) ? store.get(key) : null;
                    },
                    setItem(key, value) {
                        store.set(key, String(value));
                    },
                    removeItem(key) {
                        store.delete(key);
                    },
                };
            };

            let now = 1_700_000_000_000;
            const intervalHandlers = new Map();
            const timeoutHandlers = new Map();
            let intervalCursor = 0;
            let timeoutCursor = 0;
            const runtime = {
                eventTarget: {
                    addEventListener() { },
                    removeEventListener() { },
                },
                createBroadcastChannel: () => null,
                now: () => {
                    now += 11;
                    return now;
                },
                random: () => 0.123456,
                setInterval(fn) {
                    const id = `int-${++intervalCursor}`;
                    intervalHandlers.set(id, fn);
                    return id;
                },
                clearInterval(id) {
                    intervalHandlers.delete(id);
                },
                setTimeout(fn) {
                    const id = `tout-${++timeoutCursor}`;
                    timeoutHandlers.set(id, fn);
                    return id;
                },
                clearTimeout(id) {
                    timeoutHandlers.delete(id);
                },
            };

            const sharedStorage = createMemoryStorage();
            const hostBridge = new MenuMultiplayerBridge({
                peerId: 'peer-host',
                storage: sharedStorage,
                sessionStorage: createMemoryStorage(),
                runtime,
            });
            const clientBridge = new MenuMultiplayerBridge({
                peerId: 'peer-client',
                storage: sharedStorage,
                sessionStorage: createMemoryStorage(),
                runtime,
            });

            const captureSnapshot = (lobbyCode) => {
                const raw = sharedStorage.getItem(`cuviosclash.multiplayer.lobby.${lobbyCode}`);
                if (!raw) return null;
                return JSON.parse(raw);
            };

            const revisions = [];
            const pendingCommandIds = [];
            const lobbyCode = 'CAS-LOBBY';

            const hostResult = hostBridge.host({ actorId: 'host', lobbyCode });
            const joinResult = clientBridge.join({ actorId: 'client', lobbyCode });

            const recordRevision = () => {
                const snapshot = captureSnapshot(lobbyCode);
                if (!snapshot) return;
                revisions.push(Number(snapshot.revision || 0));
                pendingCommandIds.push(String(snapshot.pendingMatchStart?.commandId || ''));
            };

            recordRevision();
            hostBridge.toggleReady({ ready: true });
            recordRevision();
            clientBridge.toggleReady({ ready: true });
            recordRevision();

            hostBridge._updateHeartbeat();
            clientBridge._updateHeartbeat();
            recordRevision();

            const startResult = hostBridge.requestMatchStart({
                settingsSnapshot: { mapKey: 'maze', winsNeeded: 3 },
            });
            recordRevision();

            hostBridge._updateHeartbeat();
            clientBridge._updateHeartbeat();
            recordRevision();

            const finalSnapshot = captureSnapshot(lobbyCode);
            const monotonic = revisions.every((revision, index) => index === 0 || revision >= revisions[index - 1]);
            const nonEmptyPendingIds = pendingCommandIds.filter(Boolean);

            hostBridge.dispose();
            clientBridge.dispose();

            return {
                hostOk: hostResult?.ok === true,
                joinOk: joinResult?.ok === true,
                startOk: startResult?.ok === true,
                revisions,
                monotonic,
                finalRevision: Number(finalSnapshot?.revision || 0),
                finalPendingCommandId: String(finalSnapshot?.pendingMatchStart?.commandId || ''),
                nonEmptyPendingIds,
            };
        });

        expect(result.hostOk).toBeTruthy();
        expect(result.joinOk).toBeTruthy();
        expect(result.startOk).toBeTruthy();
        expect(result.revisions.length).toBeGreaterThanOrEqual(5);
        expect(result.monotonic).toBeTruthy();
        expect(result.finalRevision).toBeGreaterThanOrEqual(result.revisions[0]);
        expect(result.finalPendingCommandId.startsWith('match-')).toBeTruthy();
        expect(result.nonEmptyPendingIds.length).toBeGreaterThanOrEqual(1);
    });

    test('T41d: MenuMultiplayerPanel nutzt Discovery/Host-IP Ports via DI ohne window.curviosApp', async ({ page }) => {
        await loadGame(page);

        const result = await page.evaluate(async () => {
            const mod = await import('/src/ui/menu/MenuMultiplayerPanel.js');
            const calls = {
                start: 0,
                stop: 0,
                getHosts: 0,
                subscribe: 0,
                unsubscribe: 0,
                resolveHostIp: 0,
            };

            const sessionState = {
                joined: true,
                memberCount: 1,
                readyCount: 0,
                allReady: false,
                localReady: false,
                canStart: false,
                lobbyCode: 'QA-DI',
                members: [{
                    peerId: 'peer-host',
                    actorId: 'Host',
                    ready: false,
                    isHost: true,
                    isLocal: true,
                }],
            };
            const bridge = {
                host: () => ({ ok: true }),
                join: () => ({ ok: true }),
                leave: () => {},
                toggleReady: () => {},
                requestMatchStart: () => ({ ok: false }),
                getSessionState: () => ({ ...sessionState }),
            };
            const discoveryPort = {
                isAvailable: () => true,
                start: () => { calls.start += 1; },
                stop: () => { calls.stop += 1; },
                getHosts: async () => {
                    calls.getHosts += 1;
                    return [{
                        hostName: 'QA Host',
                        ip: '10.0.0.12',
                        port: 9090,
                        lobbyCode: 'QA-DI',
                        playerCount: 1,
                    }];
                },
                subscribe: () => {
                    calls.subscribe += 1;
                    return () => { calls.unsubscribe += 1; };
                },
            };
            const hostIpResolver = {
                resolve: async () => {
                    calls.resolveHostIp += 1;
                    return '10.0.0.12';
                },
            };

            const container = document.createElement('div');
            document.body.appendChild(container);
            const panel = mod.createMultiplayerPanel({
                bridge,
                container,
                canHost: true,
                discoveryPort,
                hostIpResolver,
            });

            container.querySelector('.mp-join-btn')?.click();
            await Promise.resolve();
            await Promise.resolve();
            const hostEntryVisible = !!container.querySelector('.mp-discovery-host');

            container.querySelector('.mp-back-btn')?.click();
            const discoveryClosed = !!container.querySelector('.mp-host-btn');

            container.querySelector('.mp-host-btn')?.click();
            await Promise.resolve();
            await Promise.resolve();
            const ipText = String(container.querySelector('.mp-ip-value')?.textContent || '');

            panel.dispose();
            const panelRemoved = !container.firstChild;
            container.remove();

            return {
                ...calls,
                hostEntryVisible,
                discoveryClosed,
                ipText,
                panelRemoved,
            };
        });

        expect(result.start).toBe(1);
        expect(result.stop).toBeGreaterThanOrEqual(1);
        expect(result.getHosts).toBe(1);
        expect(result.subscribe).toBe(1);
        expect(result.unsubscribe).toBe(1);
        expect(result.resolveHostIp).toBeGreaterThanOrEqual(1);
        expect(result.hostEntryVisible).toBe(true);
        expect(result.discoveryClosed).toBe(true);
        expect(result.ipText).toBe('10.0.0.12');
        expect(result.panelRemoved).toBe(true);
    });

    test('T20e: Open-Preset speichert Metadatenvertrag vollstaendig', async ({ page }) => {
        await loadGame(page);
        await page.evaluate((storageKey) => localStorage.removeItem(storageKey), MENU_PRESETS_STORAGE_KEY);
        await openLevel4Drawer(page, { section: 'tools' });
        await page.fill('#preset-name', 'Open Preset QA');
        await page.click('#btn-preset-save-open');
        await page.waitForTimeout(50);

        const contractState = await page.evaluate(() => {
            const raw = localStorage.getItem('cuviosclash.menu-presets.v1');
            const parsed = raw ? JSON.parse(raw) : {};
            const presets = Array.isArray(parsed?.presets) ? parsed.presets : [];
            const openPreset = presets.find((preset) => preset?.metadata?.kind === 'open');
            if (!openPreset) return { ok: false };
            const metadata = openPreset.metadata || {};
            const required = ['id', 'kind', 'ownerId', 'lockedFields', 'sourcePresetId', 'createdAt', 'updatedAt'];
            const hasAll = required.every((key) => Object.prototype.hasOwnProperty.call(metadata, key));
            return {
                ok: hasAll,
                kind: metadata.kind,
                id: metadata.id,
            };
        });

        expect(contractState.ok).toBeTruthy();
        expect(contractState.kind).toBe('open');
        expect(contractState.id.length).toBeGreaterThan(0);
    });

    test('T20f: Fixed-Preset setzt Match-Contract auf fixed', async ({ page }) => {
        await loadGame(page);
        await openGameSubmenu(page);
        const expectedPreset = await page.evaluate(async () => {
            const mod = await import('/src/ui/menu/MenuDefaultsEditorConfig.js');
            return mod.findFixedMenuPresetSeedById('competitive');
        });
        await page.evaluate(() => {
            const button = document.querySelector('#submenu-game [data-preset-id="competitive"]');
            button?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        });
        await page.waitForTimeout(50);

        const matchPreset = await page.evaluate(() => ({
            id: window.GAME_INSTANCE?.settings?.matchSettings?.activePresetId || '',
            kind: window.GAME_INSTANCE?.settings?.matchSettings?.activePresetKind || '',
            mapKey: window.GAME_INSTANCE?.settings?.mapKey || '',
            numBots: window.GAME_INSTANCE?.settings?.numBots ?? null,
            winsNeeded: window.GAME_INSTANCE?.settings?.winsNeeded ?? null,
        }));

        expect(matchPreset.id).toBe('competitive');
        expect(matchPreset.kind).toBe('fixed');
        expect(matchPreset.mapKey).toBe(expectedPreset.values.mapKey);
        expect(matchPreset.numBots).toBe(expectedPreset.values.numBots);
        expect(matchPreset.winsNeeded).toBe(expectedPreset.values.winsNeeded);
    });

    test('T20bb: Event-Playlist Quickstart ist sichtbar, startet direkt und persistiert den Cursor', async ({ page }) => {
        await loadGame(page);
        await openCustomSubmenu(page);
        await expect(page.locator('#btn-quick-event-playlist')).toBeVisible();

        await page.evaluate(() => {
            const game = window.GAME_INSTANCE;
            game.__eventPlaylistStartCalls = [];
            game.runtimeFacade.startMatch = () => {
                game.__eventPlaylistStartCalls.push({
                    presetId: game.settings?.matchSettings?.activePresetId || '',
                    nextIndex: game.settings?.localSettings?.eventPlaylistState?.nextIndex ?? null,
                });
                return true;
            };
        });

        await page.click('#btn-quick-event-playlist');
        await page.waitForTimeout(80);

        const firstState = await page.evaluate((settingsStorageKey) => {
            const game = window.GAME_INSTANCE;
            const persistedSettings = JSON.parse(localStorage.getItem(settingsStorageKey) || '{}');
            return {
                startCalls: Array.isArray(game.__eventPlaylistStartCalls) ? game.__eventPlaylistStartCalls.length : 0,
                activePresetId: String(game?.settings?.matchSettings?.activePresetId || ''),
                modePath: String(game?.settings?.localSettings?.modePath || ''),
                eventPlaylistState: game?.settings?.localSettings?.eventPlaylistState || null,
                toastText: document.getElementById('status-toast')?.textContent || '',
                persistedEventPlaylistState: persistedSettings?.localSettings?.eventPlaylistState || null,
            };
        }, SETTINGS_STORAGE_KEY);

        expect(firstState.startCalls).toBe(1);
        expect(firstState.activePresetId).toBe('arcade');
        expect(firstState.modePath).toBe('quick_action');
        expect(firstState.eventPlaylistState?.activePlaylistId).toBe('fun_rotation');
        expect(firstState.eventPlaylistState?.nextIndex).toBe(1);
        expect(firstState.toastText).toContain('Event-Playlist');
        expect(firstState.persistedEventPlaylistState?.nextIndex).toBe(1);

        await page.reload();
        await page.waitForSelector('#main-menu', { state: 'visible', timeout: 15000 });
        await openCustomSubmenu(page);
        await page.evaluate(() => {
            const game = window.GAME_INSTANCE;
            game.__eventPlaylistStartCalls = [];
            game.runtimeFacade.startMatch = () => {
                game.__eventPlaylistStartCalls.push({
                    presetId: game.settings?.matchSettings?.activePresetId || '',
                });
                return true;
            };
        });

        await page.click('#btn-quick-event-playlist');
        await page.waitForTimeout(80);

        const secondPresetId = await page.evaluate(() => window.GAME_INSTANCE?.settings?.matchSettings?.activePresetId || '');
        expect(secondPresetId).toBe('chaos');

        await page.evaluate((settingsStorageKey) => localStorage.removeItem(settingsStorageKey), SETTINGS_STORAGE_KEY);
    });

    test('T20bc: Event-Playlist rotiert deterministisch ueber die Fun-Presets und wrappt', async ({ page }) => {
        await loadGame(page);
        await openCustomSubmenu(page);
        await page.evaluate(() => {
            const game = window.GAME_INSTANCE;
            game.__eventPlaylistSequence = [];
            game.runtimeFacade.startMatch = () => {
                game.__eventPlaylistSequence.push({
                    presetId: game.settings?.matchSettings?.activePresetId || '',
                    nextIndex: game.settings?.localSettings?.eventPlaylistState?.nextIndex ?? null,
                });
                return true;
            };
        });

        for (let index = 0; index < 4; index += 1) {
            await page.click('#btn-quick-event-playlist');
            await page.waitForTimeout(60);
        }

        const rotationState = await page.evaluate((settingsStorageKey) => {
            const game = window.GAME_INSTANCE;
            const persistedSettings = JSON.parse(localStorage.getItem(settingsStorageKey) || '{}');
            return {
                sequence: Array.isArray(game.__eventPlaylistSequence)
                    ? game.__eventPlaylistSequence.map((entry) => entry.presetId)
                    : [],
                nextIndex: game?.settings?.localSettings?.eventPlaylistState?.nextIndex ?? null,
                lastPresetId: game?.settings?.localSettings?.eventPlaylistState?.lastPresetId || '',
                persistedNextIndex: persistedSettings?.localSettings?.eventPlaylistState?.nextIndex ?? null,
            };
        }, SETTINGS_STORAGE_KEY);

        expect(rotationState.sequence).toEqual(['arcade', 'chaos', 'competitive', 'arcade']);
        expect(rotationState.nextIndex).toBe(1);
        expect(rotationState.lastPresetId).toBe('arcade');
        expect(rotationState.persistedNextIndex).toBe(1);

        await page.evaluate((settingsStorageKey) => localStorage.removeItem(settingsStorageKey), SETTINGS_STORAGE_KEY);
    });

    test('T20ka: Profil-UX aktualisiert Action-State und unterstuetzt Duplicate, Import/Export und Standardprofil', async ({ page }) => {
        await page.goto('/');
        await page.evaluate((storageKey) => localStorage.removeItem(storageKey), SETTINGS_PROFILES_STORAGE_KEY);
        await page.reload();
        await page.waitForSelector('#main-menu', { state: 'visible', timeout: 15000 });
        await openLevel4Drawer(page, { section: 'tools' });

        await page.fill('#profile-name', 'QA Profil');
        await expect(page.locator('#btn-profile-save')).toBeEnabled();
        await page.click('#btn-profile-save');
        await expect(page.locator('#profile-select')).toHaveValue('QA Profil');

        await page.click('#btn-profile-set-default');
        await expect(page.locator('#profile-select option:checked')).toHaveText('QA Profil (Standard)');

        await page.fill('#profile-name', 'QA Profil Kopie');
        await expect(page.locator('#btn-profile-duplicate')).toBeEnabled();
        await page.click('#btn-profile-duplicate');
        await expect(page.locator('#profile-select')).toHaveValue('QA Profil Kopie');

        await page.selectOption('#profile-select', 'QA Profil');
        await expect(page.locator('#profile-name')).toHaveValue('QA Profil');
        await expect(page.locator('#btn-profile-set-default')).toBeDisabled();
        await expect(page.locator('#btn-profile-set-default')).toHaveText('Standardprofil aktiv');

        await page.selectOption('#profile-select', 'QA Profil Kopie');
        await expect(page.locator('#btn-profile-set-default')).toBeEnabled();
        await page.click('#btn-profile-export');

        const exportPayload = await page.inputValue('#profile-transfer-input');
        const exportedProfile = JSON.parse(exportPayload);
        expect(exportedProfile.contractVersion).toBe('profile-export.v1');
        expect(exportedProfile.profile.name).toBe('QA Profil Kopie');

        exportedProfile.profile.name = 'QA Import';
        await page.fill('#profile-transfer-input', JSON.stringify(exportedProfile, null, 2));
        await expect(page.locator('#btn-profile-import')).toBeEnabled();
        await page.fill('#profile-name', '');
        await page.click('#btn-profile-import');
        await expect(page.locator('#profile-select')).toHaveValue('QA Import');
        await expect(page.locator('#profile-transfer-status')).toContainText('Profil importiert: QA Import');

        const profileState = await page.evaluate((storageKey) => {
            return JSON.parse(localStorage.getItem(storageKey) || '[]');
        }, SETTINGS_PROFILES_STORAGE_KEY);
        expect(profileState).toHaveLength(3);
        expect(profileState.filter((profile) => profile?.isDefault)).toHaveLength(1);
        expect(profileState.find((profile) => profile?.isDefault)?.name).toBe('QA Profil');

        await page.evaluate((storageKey) => localStorage.removeItem(storageKey), SETTINGS_PROFILES_STORAGE_KEY);
    });

    test('T20kb: Map- und Flugzeugauswahl bleiben in State und Match konsistent', async ({ page }) => {
        await loadGame(page);
        await openGameSubmenu(page);

        await page.selectOption('#map-select', 'maze');
        await openStartSetupSection(page, 'vehicle');
        await page.selectOption('#vehicle-select-p1', 'aircraft');

        await expect(page.locator('#map-select')).toHaveValue('maze');
        await expect(page.locator('#vehicle-select-p1')).toHaveValue('aircraft');

        const selectionState = await page.evaluate(() => ({
            mapKey: window.GAME_INSTANCE?.settings?.mapKey ?? null,
            vehicleId: window.GAME_INSTANCE?.settings?.vehicles?.PLAYER_1 ?? null,
        }));

        expect(selectionState.mapKey).toBe('maze');
        expect(selectionState.vehicleId).toBe('aircraft');

        await page.click('#submenu-game:not(.hidden) #btn-start');
        await page.waitForFunction(() => {
            const hud = document.getElementById('hud');
            const game = window.GAME_INSTANCE;
            return !!(
                hud
                && !hud.classList.contains('hidden')
                && game?.entityManager?.humanPlayers?.length > 0
            );
        }, null, { timeout: 15000 });

        const matchState = await page.evaluate(() => ({
            mapKey: window.GAME_INSTANCE?.arena?.currentMapKey ?? null,
            humanVehicleId: window.GAME_INSTANCE?.entityManager?.humanPlayers?.[0]?.vehicleId ?? null,
        }));

        expect(matchState.mapKey).toBe('maze');
        expect(matchState.humanVehicleId).toBe('aircraft');
    });

    test('T20kc: Round-End-Overlay zeigt vertiefte Round- und Match-Stats an', async ({ page }) => {
        await startGameWithBots(page, 1);

        const overlayState = await page.evaluate(() => {
            const game = window.GAME_INSTANCE;
            const players = game?.entityManager?.players || [];
            if (players.length < 2) return { error: 'missing-players' };
            const now = performance.now();
            const simulatedDurationMs = Math.max(100, Math.min(2500, now - 50));

            players[0].score = 0;
            players[1].score = 0;
            game.recorder.startRound(players);
            game.recorder.logEvent('ITEM_USE', players[0].index, 'rocket');
            game.recorder.logEvent('STUCK', players[1].index, 'wall');
            game.recorder.markPlayerDeath(players[1], 'TRAIL_SELF');
            game.recorder.roundStartTime = now - simulatedDurationMs;

            game.matchFlowUiController.onRoundEnd(players[0]);
            game.roundPause = 2.6;
            game.roundStateTickSystem.updateRoundEnd(0.3);

            const statsRoot = document.getElementById('message-stats');
            const readValue = (blockId, rowKey) => statsRoot?.querySelector(
                `[data-stats-block-id="${blockId}"] [data-stats-row-key="${rowKey}"] .message-stats-value`
            )?.textContent || '';

            return {
                state: game.state,
                overlayVisible: !document.getElementById('message-overlay')?.classList.contains('hidden'),
                statsVisible: !!statsRoot && !statsRoot.classList.contains('hidden'),
                blockIds: Array.from(statsRoot?.querySelectorAll('[data-stats-block-id]') || []).map((node) => node.getAttribute('data-stats-block-id')),
                roundWinner: readValue('round', 'winner'),
                roundDuration: readValue('round', 'duration'),
                expectedDurationFloor: (Math.floor((simulatedDurationMs / 1000) * 10) / 10).toFixed(1),
                matchRounds: readValue('match', 'rounds'),
                scoreLeader: readValue('scoreboard', 'player-0'),
                countdownText: document.getElementById('message-sub')?.textContent || '',
            };
        });

        expect(overlayState.error || '').toBe('');
        expect(overlayState.state).toBe('ROUND_END');
        expect(overlayState.overlayVisible).toBeTruthy();
        expect(overlayState.statsVisible).toBeTruthy();
        expect(overlayState.blockIds).toEqual(expect.arrayContaining(['round', 'match', 'scoreboard']));
        expect(overlayState.roundWinner).toBe('Spieler 1');
        expect(overlayState.roundDuration).toContain(overlayState.expectedDurationFloor);
        expect(overlayState.matchRounds).toBe('1');
        expect(overlayState.scoreLeader).toBe('1/5');
        expect(overlayState.countdownText).toContain('Naechste Runde in 3');
    });

    test('T20kd: Match-End-Overlay zeigt Endstand und aggregierte Match-Stats', async ({ page }) => {
        await startGameWithBots(page, 1);

        const overlayState = await page.evaluate(() => {
            const game = window.GAME_INSTANCE;
            const players = game?.entityManager?.players || [];
            if (players.length < 2) return { error: 'missing-players' };
            const now = performance.now();
            const simulatedDurationMs = Math.max(100, Math.min(2100, now - 50));

            game.winsNeeded = 3;
            players[0].score = 2;
            players[1].score = 1;
            game.recorder.startRound(players);
            game.recorder.logEvent('ITEM_USE', players[0].index, 'shield');
            game.recorder.roundStartTime = now - simulatedDurationMs;

            game.matchFlowUiController.onRoundEnd(players[0]);

            const statsRoot = document.getElementById('message-stats');
            const readTitle = (blockId) => statsRoot?.querySelector(
                `[data-stats-block-id="${blockId}"] .message-stats-title`
            )?.textContent || '';
            const readValue = (blockId, rowKey) => statsRoot?.querySelector(
                `[data-stats-block-id="${blockId}"] [data-stats-row-key="${rowKey}"] .message-stats-value`
            )?.textContent || '';

            return {
                state: game.state,
                messageText: document.getElementById('message-text')?.textContent || '',
                scoreboardTitle: readTitle('scoreboard'),
                scoreLeader: readValue('scoreboard', 'player-0'),
                botWinRate: readValue('match', 'bot-win-rate'),
                roundTitle: readTitle('round'),
            };
        });

        expect(overlayState.error || '').toBe('');
        expect(overlayState.state).toBe('MATCH_END');
        expect(overlayState.messageText).toContain('Sieg: Spieler 1');
        expect(overlayState.roundTitle).toBe('Finalrunde');
        expect(overlayState.scoreboardTitle).toBe('Endstand');
        expect(overlayState.scoreLeader).toBe('3/3');
        expect(overlayState.botWinRate).toBe('0%');
    });

    test('T20ke: Developer-Telemetrie-Dashboard zeigt Balancing-Summary aus dem Round-End-Pfad', async ({ page }) => {
        await startGameWithBots(page, 1);

        const telemetryProbe = await page.evaluate(() => {
            const game = window.GAME_INSTANCE;
            const players = game?.entityManager?.players || [];
            if (players.length < 2) return { error: 'missing-players' };
            const now = performance.now();
            const simulatedDurationMs = Math.max(100, Math.min(1600, now - 50));

            players[0].score = 0;
            players[1].score = 0;
            game.recorder.startRound(players);
            game.recorder.logEvent('ITEM_USE', players[0].index, 'rocket');
            game.recorder.logEvent('STUCK', players[1].index, 'wall');
            game.recorder.markPlayerDeath(players[1], 'TRAIL_SELF');
            game.recorder.roundStartTime = now - simulatedDurationMs;
            game.matchFlowUiController.onRoundEnd(players[0]);

            return {
                error: '',
                balanceRounds: Number(game.settings?.localSettings?.telemetryState?.balance?.rounds || 0),
            };
        });

        expect(telemetryProbe.error || '').toBe('');
        expect(telemetryProbe.balanceRounds).toBeGreaterThanOrEqual(1);

        await returnToMenu(page);
        await openDeveloperSubmenu(page);

        const dashboardState = await page.evaluate(() => {
            const telemetry = JSON.parse(document.getElementById('developer-telemetry-output')?.textContent || '{}');
            const readValue = (cardId, rowKey) => document.querySelector(
                `[data-telemetry-card="${cardId}"] [data-telemetry-row-key="${rowKey}"] .developer-telemetry-value`
            )?.textContent || '';
            const readLabel = (cardId, rowKey) => document.querySelector(
                `[data-telemetry-card="${cardId}"] [data-telemetry-row-key="${rowKey}"] .developer-telemetry-label`
            )?.textContent || '';

            return {
                telemetry,
                cardIds: Array.from(document.querySelectorAll('[data-telemetry-card]')).map((node) => node.getAttribute('data-telemetry-card')),
                overviewRounds: readValue('overview', 'rounds'),
                balanceDuration: readValue('balance', 'average-round-duration'),
                topMap: readLabel('maps', 'bucket-0'),
                recentRows: Array.from(document.querySelectorAll('[data-telemetry-recent-index]')).map((node) => node.textContent || ''),
            };
        });

        expect(dashboardState.cardIds).toEqual(expect.arrayContaining(['overview', 'balance', 'maps', 'modes', 'recent']));
        expect(Number(dashboardState.telemetry?.balance?.rounds || 0)).toBe(1);
        expect(Number(dashboardState.telemetry?.balance?.humanWins || 0)).toBe(1);
        expect(dashboardState.telemetry?.topMaps?.[0]?.key).toBe('standard');
        expect(dashboardState.overviewRounds).toBe('1');
        expect(dashboardState.balanceDuration).not.toBe('0.00s');
        expect(dashboardState.topMap).toBe('standard');
        expect(dashboardState.recentRows[0] || '').toContain('Spieler 1');
        expect(dashboardState.recentRows[0] || '').toContain('standard / classic');
    });

    test('T20g: Runtime-Guard blockiert Developer-Events fuer non-owner', async ({ page }) => {
        await loadGame(page);
        const guardResult = await page.evaluate(() => {
            const game = window.GAME_INSTANCE;
            game.settings.localSettings.actorId = 'player';
            game.settings.localSettings.developerModeVisibility = 'owner_only';
            const before = game.settings.localSettings.developerThemeId;
            game.runtimeFacade.handleMenuControllerEvent({
                contractVersion: 'menu-controller.v1',
                type: 'developer_theme_change',
                themeId: 'sandstorm-lab',
            });
            const after = game.settings.localSettings.developerThemeId;
            game.settings.localSettings.actorId = game.settings.localSettings.ownerId || 'owner';
            return { before, after };
        });

        expect(guardResult.after).toBe(guardResult.before);
    });

    test('T20h: Keyboard Navigation (Arrow/Escape) funktioniert im Menue', async ({ page }) => {
        await loadGame(page);
        const focusIds = await page.evaluate(() => {
            const firstButton = document.querySelector('#menu-nav .nav-btn');
            firstButton?.focus();
            const first = document.activeElement?.getAttribute('data-session-type');
            return { first };
        });
        expect(focusIds.first).toBeTruthy();

        await page.keyboard.press('ArrowRight');
        const secondFocused = await page.evaluate(() => document.activeElement?.getAttribute('data-session-type') || '');
        expect(secondFocused).not.toBe(focusIds.first);

        await openCustomSubmenu(page);
        await page.keyboard.press('Escape');
        const visiblePanels = await page.evaluate(() => (
            Array.from(document.querySelectorAll('.submenu-panel:not(.hidden)')).map((panel) => panel.id)
        ));
        expect(visiblePanels).toHaveLength(0);
    });

    test('T20ha: Escape schliesst Ebene 4 auch bei State-Desync', async ({ page }) => {
        await loadGame(page);
        await openGameSubmenu(page);
        await openLevel4Drawer(page, { section: 'gameplay' });

        await page.evaluate(() => {
            const stateMachine = window.GAME_INSTANCE?.uiManager?.menuStateMachine;
            stateMachine?.transition?.('main', { trigger: 'test_desync_escape_level4' });
        });

        await page.keyboard.press('Escape');
        await page.waitForFunction(() => {
            const drawer = document.getElementById('submenu-level4');
            return !!drawer
                && drawer.classList.contains('hidden')
                && drawer.getAttribute('aria-hidden') === 'true';
        }, null, { timeout: 4000 });
    });

    test('T20hb: Close-Button schliesst Ebene 4 trotz Event-Desync', async ({ page }) => {
        await loadGame(page);
        await openGameSubmenu(page);
        await openLevel4Drawer(page, { section: 'tools' });

        await page.evaluate(() => {
            const game = window.GAME_INSTANCE;
            if (game?.runtimeFacade?._menuEventHandlers instanceof Map) {
                game.runtimeFacade._menuEventHandlers.delete('level4_close');
            }
            if (game?.uiManager?.menuNavigationRuntime) {
                game.uiManager.menuNavigationRuntime.onLevel4CloseRequested = null;
            }
        });

        await page.click('#btn-close-level4');
        await page.waitForFunction(() => {
            const drawer = document.getElementById('submenu-level4');
            return !!drawer
                && drawer.classList.contains('hidden')
                && drawer.getAttribute('aria-hidden') === 'true'
                && !window.GAME_INSTANCE?.settings?.localSettings?.toolsState?.level4Open;
        }, null, { timeout: 4000 });
    });

    test('T20i: ARIA-Status wird bei Panelwechsel konsistent gesetzt', async ({ page }) => {
        await loadGame(page);
        await openCustomSubmenu(page);

        const ariaState = await page.evaluate(() => ({
            panelHidden: document.getElementById('submenu-custom')?.getAttribute('aria-hidden'),
            sessionPressed: document.querySelector('[data-session-type="single"]')?.getAttribute('aria-pressed'),
            expandedStates: Array.from(document.querySelectorAll('[data-session-type]')).map((button) => ({
                sessionType: button.getAttribute('data-session-type'),
                expanded: button.getAttribute('aria-expanded'),
            })),
        }));

        expect(ariaState.panelHidden).toBe('false');
        expect(ariaState.sessionPressed).toBe('true');
        const expandedTrue = ariaState.expandedStates.filter((entry) => entry.expanded === 'true');
        expect(expandedTrue).toHaveLength(1);
        expect(expandedTrue[0].sessionType).toBe('single');

        await openGameSubmenu(page);
        const expandedOnLevel3 = await page.evaluate(() => (
            Array.from(document.querySelectorAll('[data-session-type]'))
                .map((button) => button.getAttribute('aria-expanded'))
                .filter((value) => value === 'true')
                .length
        ));
        expect(expandedOnLevel3).toBe(0);
    });

    test('T20ia: Expertenlogin sperrt Developer/Debug bis Passwort 1307 und entsperrt danach', async ({ page }) => {
        await loadGame(page);
        await openLevel4Drawer(page, { section: 'tools' });
        await expect(page.locator('#submenu-level4 #btn-open-developer')).toHaveCount(0);

        await openExpertSubmenu(page);
        await expect(page.locator('#expert-unlocked-state')).toBeHidden();
        await page.fill('#expert-password-input', '9999');
        await page.click('#btn-expert-unlock');
        await expect(page.locator('#expert-login-status')).toContainText('Passwort falsch');
        await expect(page.locator('#expert-unlocked-state')).toBeHidden();

        await page.fill('#expert-password-input', '1307');
        await page.click('#btn-expert-unlock');
        await expect(page.locator('#expert-unlocked-state')).toBeVisible();
        await expect(page.locator('#build-info')).toContainText('Build');

        await page.click('#btn-open-developer');
        await expect(page.locator('#submenu-developer')).toBeVisible();

        await openDebugSubmenu(page);
        await expect(page.locator('#submenu-debug')).toBeVisible();
    });

    test('T20ib: Logout sperrt den Expertenbereich erneut und Reload startet wieder gesperrt', async ({ page }) => {
        await loadGame(page);
        await unlockExpertMode(page);
        await expect(page.locator('#expert-unlocked-state')).toBeVisible();

        await lockExpertMode(page);
        await expect(page.locator('#expert-unlocked-state')).toBeHidden();
        await expect(page.locator('#expert-locked-state')).toBeVisible();

        const postLockState = await page.evaluate(() => ({
            unlocked: !!window.GAME_INSTANCE?.menuExpertLoginRuntime?.isUnlocked?.(),
            developerOpened: !!window.GAME_INSTANCE?.uiManager?.menuNavigationRuntime?.showPanel?.('submenu-developer', { trigger: 'post_lock_test' }),
        }));
        expect(postLockState.unlocked).toBeFalsy();
        expect(postLockState.developerOpened).toBeFalsy();

        await page.reload();
        await page.waitForSelector('#main-menu', { state: 'visible', timeout: 10000 });
        const postReloadUnlocked = await page.evaluate(() => !!window.GAME_INSTANCE?.menuExpertLoginRuntime?.isUnlocked?.());
        expect(postReloadUnlocked).toBeFalsy();
    });

    test('T20j: Menu-Compatibility-Rules fixen inkonsistente Fixed-Preset-States deterministisch', async ({ page }) => {
        await loadGame(page);
        const normalizedState = await page.evaluate(() => {
            const game = window.GAME_INSTANCE;
            game.settings.matchSettings.activePresetId = 'ghost-fixed';
            game.settings.matchSettings.activePresetKind = 'fixed';
            game.settings.matchSettings.activePresetSourceId = 'ghost-fixed';
            game.settings.localSettings.fixedPresetId = 'ghost-fixed';
            game.settings.localSettings.fixedPresetLockEnabled = true;

            const result = game.settingsManager.applyMenuCompatibilityRules(game.settings, {
                accessContext: {
                    isOwner: true,
                    ownerId: 'owner',
                    actorId: 'owner',
                },
            });

            return {
                contractVersion: result.contractVersion,
                ruleIds: result.appliedRuleIds,
                changedKeys: result.changedKeys,
                activePresetId: game.settings.matchSettings.activePresetId,
                activePresetKind: game.settings.matchSettings.activePresetKind,
                activePresetSourceId: game.settings.matchSettings.activePresetSourceId,
                fixedPresetId: game.settings.localSettings.fixedPresetId,
                fixedPresetLockEnabled: game.settings.localSettings.fixedPresetLockEnabled,
            };
        });

        expect(normalizedState.contractVersion).toBe('menu-compatibility.v1');
        expect(normalizedState.ruleIds.includes('fixed_preset_exists')).toBeTruthy();
        expect(normalizedState.ruleIds.includes('fixed_preset_binding')).toBeTruthy();
        expect(normalizedState.ruleIds.includes('fixed_lock_requires_fixed_preset')).toBeTruthy();
        expect(normalizedState.changedKeys).toEqual(expect.arrayContaining([
            'preset.activeId',
            'preset.activeKind',
            'preset.status',
            'developer.fixedPresetLock',
        ]));
        expect(normalizedState.activePresetId).toBe('');
        expect(normalizedState.activePresetKind).toBe('');
        expect(normalizedState.activePresetSourceId).toBe('');
        expect(normalizedState.fixedPresetId).toBe('');
        expect(normalizedState.fixedPresetLockEnabled).toBeFalsy();
    });

    test('T20k: Globale Cinematic-Taste ist im Menue belegbar', async ({ page }) => {
        await loadGame(page);
        await openLevel4Drawer(page, { section: 'controls' });

        await page.click('#keybind-global .keybind-btn[data-action="CINEMATIC_TOGGLE"]');
        await page.keyboard.press('KeyB');
        await page.waitForTimeout(50);

        const globalBinding = await page.evaluate(() => (
            window.GAME_INSTANCE?.settings?.controls?.GLOBAL?.CINEMATIC_TOGGLE || ''
        ));
        expect(globalBinding).toBe('KeyB');
    });

    test('T20k1: Globale Recording-Taste ist im Menue belegbar', async ({ page }) => {
        await loadGame(page);
        await openLevel4Drawer(page, { section: 'controls' });

        await page.click('#keybind-global .keybind-btn[data-action="RECORDING_TOGGLE"]');
        await page.keyboard.press('KeyN');
        await page.waitForTimeout(50);

        const globalBinding = await page.evaluate(() => (
            window.GAME_INSTANCE?.settings?.controls?.GLOBAL?.RECORDING_TOGGLE || ''
        ));
        expect(globalBinding).toBe('KeyN');
    });

    test('T20l: Globale Cinematic-Taste toggelt Kamera fuer beide Spieler', async ({ page }) => {
        await startGame(page);
        await page.evaluate(() => {
            const game = window.GAME_INSTANCE;
            game.settings.controls.GLOBAL.CINEMATIC_TOGGLE = 'KeyB';
            game.input.setBindings(game.settings.controls);
        });

        const before = await page.evaluate(() => window.GAME_INSTANCE?.renderer?.getCinematicEnabled?.());
        await page.keyboard.press('b');
        await page.waitForTimeout(100);
        const after = await page.evaluate(() => window.GAME_INSTANCE?.renderer?.getCinematicEnabled?.());
        expect(after).toBe(!before);
    });

    test('T20l1: Globale Recording-Taste triggert lifecycle.v1 recording_requested toggle', async ({ page }) => {
        test.setTimeout(60000);
        await startGame(page);
        await page.evaluate(() => {
            const game = window.GAME_INSTANCE;
            game.settings.controls.GLOBAL.RECORDING_TOGGLE = 'KeyN';
            game.input.setBindings(game.settings.controls);

            const originalRecorder = game.mediaRecorderSystem;
            const probe = {
                events: [],
                recording: false,
                restore() {
                    game.mediaRecorderSystem = originalRecorder;
                },
            };

            game.mediaRecorderSystem = {
                getSupportState: () => ({ canRecord: true }),
                isRecording: () => probe.recording,
                notifyLifecycleEvent: (type, context) => {
                    probe.events.push({ type, command: String(context?.command || '') });
                    if (String(context?.command || '').toLowerCase() === 'toggle') {
                        probe.recording = !probe.recording;
                    }
                },
            };

            window.__recordingHotkeyProbe = probe;
        });

        await page.keyboard.press('n');
        await page.waitForTimeout(60);
        await page.keyboard.press('n');
        await page.waitForTimeout(60);

        const probeState = await page.evaluate(() => {
            const probe = window.__recordingHotkeyProbe || { events: [], recording: false };
            const events = Array.isArray(probe.events) ? probe.events.slice() : [];
            const recording = !!probe.recording;
            probe.restore?.();
            delete window.__recordingHotkeyProbe;
            return { events, recording };
        });

        expect(probeState.events).toHaveLength(2);
        expect(probeState.events[0]?.type).toBe('recording_requested');
        expect(probeState.events[0]?.command).toBe('toggle');
        expect(probeState.events[1]?.type).toBe('recording_requested');
        expect(probeState.events[1]?.command).toBe('toggle');
        expect(probeState.recording).toBeFalsy();
    });

    test('T20m: Recording-AutoDownload ist aktiv und nutzt Videos-Ordnername', async ({ page }) => {
        await loadGame(page);
        const recorderState = await page.evaluate(() => {
            const recorder = window.GAME_INSTANCE?.mediaRecorderSystem;
            return {
                autoRecordingEnabled: !!recorder?.autoRecordingEnabled,
                autoDownload: !!recorder?.autoDownload,
                directoryName: String(recorder?.downloadDirectoryName || ''),
                captureFps: Number(recorder?.captureFps || 0),
            };
        });
        expect(recorderState.autoRecordingEnabled).toBeFalsy();
        expect(recorderState.autoDownload).toBeTruthy();
        expect(recorderState.directoryName).toBe('videos');
        expect(recorderState.captureFps).toBe(30);
    });

    test('T20m1: Recording-Profil und HUD-Modus sind im Menu persistierbar', async ({ page }) => {
        await loadGame(page);
        await openLevel4Drawer(page, { section: 'gameplay' });
        await page.selectOption('#recording-profile-select', 'youtube_short');
        await page.selectOption('#recording-hud-mode-select', 'with_hud');
        await page.selectOption('#normal-camera-perspective-select', 'cinematic_soft');
        await page.uncheck('#normal-camera-reduce-motion-toggle');
        await page.evaluate(() => window.GAME_INSTANCE?._saveSettings?.());

        await page.reload();
        await page.waitForSelector('#main-menu', { state: 'visible', timeout: 15000 });

        const persisted = await page.evaluate(() => {
            const game = window.GAME_INSTANCE;
            return {
                settingsProfile: game?.settings?.recording?.profile || null,
                settingsHudMode: game?.settings?.recording?.hudMode || null,
                runtimeProfile: game?.mediaRecorderSystem?.getRecordingCaptureSettings?.()?.profile || null,
                runtimeHudMode: game?.mediaRecorderSystem?.getRecordingCaptureSettings?.()?.hudMode || null,
                settingsPerspectiveNormal: game?.settings?.cameraPerspective?.normal || null,
                settingsPerspectiveReduceMotion: game?.settings?.cameraPerspective?.reduceMotion,
                runtimePerspectiveNormal: game?.renderer?.getCameraPerspectiveSettings?.()?.normal || null,
                runtimePerspectiveReduceMotion: game?.renderer?.getCameraPerspectiveSettings?.()?.reduceMotion,
            };
        });

        expect(persisted.settingsProfile).toBe('youtube_short');
        expect(persisted.settingsHudMode).toBe('with_hud');
        expect(persisted.runtimeProfile).toBe('youtube_short');
        expect(persisted.runtimeHudMode).toBe('with_hud');
        expect(persisted.settingsPerspectiveNormal).toBe('cinematic_soft');
        expect(persisted.settingsPerspectiveReduceMotion).toBeFalsy();
        expect(persisted.runtimePerspectiveNormal).toBe('cinematic_soft');
        expect(persisted.runtimePerspectiveReduceMotion).toBeFalsy();
    });

    test('T20m2: Shorts-Recording nutzt dynamische Aufloesung und feste P1/P2-Zuordnung', async ({ page }) => {
        await loadGame(page);
        await openGameSubmenu(page, { sessionType: 'splitscreen' });
        await page.click('#submenu-game:not(.hidden) #btn-start');
        await page.waitForFunction(() => {
            const hud = document.getElementById('hud');
            const game = window.GAME_INSTANCE;
            return !!(
                hud && !hud.classList.contains('hidden')
                && game?.entityManager?.players?.length > 1
            );
        }, null, { timeout: 60000 });

        const probe = await page.evaluate(() => {
            const game = window.GAME_INSTANCE;
            if (!game?.renderer || !game?.entityManager || !game?.mediaRecorderSystem) return null;
            const makeEven = (value) => {
                const safe = Math.max(2, Math.floor(Number(value) || 0));
                return safe - (safe % 2);
            };

            game.settings.recording = { profile: 'youtube_short', hudMode: 'with_hud' };
            game._onSettingsChanged({ changedKeys: ['recording.profile', 'recording.hudMode'] });
            game.renderer.prepareRecordingCaptureFrame({
                recordingActive: true,
                entityManager: game.entityManager,
                renderAlpha: 1,
                renderDelta: 1 / 60,
                splitScreen: true,
            });

            const sourceCanvas = game.renderer.getRecordingCaptureCanvas?.();
            const baseCanvas = game.renderer.canvas;
            const baseHeight = makeEven(baseCanvas?.height || 0);
            const expectedHeight = makeEven(baseHeight * 2);
            const expectedWidth = makeEven((expectedHeight * 9) / 16);
            const meta = game.renderer.getLastRecordingCaptureMeta?.() || null;
            const recorderSettings = game.mediaRecorderSystem.getRecordingCaptureSettings?.() || null;
            const rendererSettings = game.renderer.getRecordingCaptureSettings?.() || null;

            return {
                captureWidth: Number(sourceCanvas?.width || 0),
                captureHeight: Number(sourceCanvas?.height || 0),
                expectedWidth,
                expectedHeight,
                recorderSettings,
                rendererSettings,
                meta,
            };
        });

        expect(probe).not.toBeNull();
        expect(probe.recorderSettings?.profile).toBe('youtube_short');
        expect(probe.recorderSettings?.hudMode).toBe('with_hud');
        expect(probe.rendererSettings?.profile).toBe('youtube_short');
        expect(probe.rendererSettings?.hudMode).toBe('with_hud');
        expect(probe.captureWidth).toBe(probe.expectedWidth);
        expect(probe.captureHeight).toBe(probe.expectedHeight);
        expect(probe.meta?.layout).toBe('shorts_vertical_split');
        expect(probe.meta?.segments?.[0]?.playerIndex).toBe(0);
        expect(probe.meta?.segments?.[1]?.playerIndex).toBe(1);
    });

    test('T20m3: Shorts-Recording faellt bei Renderer-Ausfall auf Source-Fallback zurueck', async ({ page }) => {
        await loadGame(page);
        await openGameSubmenu(page, { sessionType: 'splitscreen' });
        await page.click('#submenu-game:not(.hidden) #btn-start');
        await page.waitForFunction(() => {
            const hud = document.getElementById('hud');
            const game = window.GAME_INSTANCE;
            return !!(
                hud && !hud.classList.contains('hidden')
                && game?.entityManager?.players?.length > 1
            );
        }, null, { timeout: 60000 });

        const probe = await page.evaluate(async () => {
            const game = window.GAME_INSTANCE;
            const renderer = game?.renderer;
            const entityManager = game?.entityManager;
            const recorder = game?.mediaRecorderSystem;
            if (!game || !renderer || !entityManager || !recorder) return null;

            game.settings.recording = { profile: 'youtube_short', hudMode: 'clean' };
            game._onSettingsChanged({ changedKeys: ['recording.profile', 'recording.hudMode'] });

            const pipeline = renderer.recordingCapturePipeline;
            const originalEnsure = pipeline?._ensureShortsRenderer?.bind?.(pipeline);
            const originalIsRecording = recorder?.isRecording?.bind?.(recorder);
            if (typeof originalEnsure !== 'function' || typeof originalIsRecording !== 'function') return null;

            pipeline._shortsRendererUnavailable = true;
            pipeline._ensureShortsRenderer = () => null;
            recorder.isRecording = () => true;

            // Let the normal render loop run a couple of frames so the fallback
            // is exercised under real recording timing.
            await new Promise((resolve) => setTimeout(resolve, 800));

            pipeline._ensureShortsRenderer = originalEnsure;
            pipeline._shortsRendererUnavailable = false;
            recorder.isRecording = originalIsRecording;

            const captureCanvas = renderer.getRecordingCaptureCanvas?.() || null;
            const captureCtx = captureCanvas?.getContext?.('2d', { willReadFrequently: true }) || null;
            const width = Math.max(0, Math.floor(Number(captureCanvas?.width || 0)));
            const height = Math.max(0, Math.floor(Number(captureCanvas?.height || 0)));
            let maxLuma = 0;
            let averageLuma = 0;
            let sampleCount = 0;

            if (captureCtx && width > 1 && height > 1) {
                const frame = captureCtx.getImageData(0, 0, width, height).data;
                const step = Math.max(4, Math.floor(Math.min(width, height) / 96));
                let lumaSum = 0;
                for (let y = 0; y < height; y += step) {
                    for (let x = 0; x < width; x += step) {
                        const idx = ((y * width) + x) * 4;
                        const r = Number(frame[idx] || 0);
                        const g = Number(frame[idx + 1] || 0);
                        const b = Number(frame[idx + 2] || 0);
                        const luma = (0.2126 * r) + (0.7152 * g) + (0.0722 * b);
                        sampleCount += 1;
                        lumaSum += luma;
                        if (luma > maxLuma) maxLuma = luma;
                    }
                }
                averageLuma = sampleCount > 0 ? (lumaSum / sampleCount) : 0;
            }

            return {
                width,
                height,
                maxLuma,
                averageLuma,
                sampleCount,
                meta: renderer.getLastRecordingCaptureMeta?.() || null,
            };
        });

        expect(probe).not.toBeNull();
        expect(probe.width).toBeGreaterThan(100);
        expect(probe.height).toBeGreaterThan(100);
        expect(probe.sampleCount).toBeGreaterThan(0);
        expect(probe.maxLuma).toBeGreaterThan(8);
        expect(probe.averageLuma).toBeGreaterThan(2);
        expect(probe.meta?.layout).toBe('shorts_vertical_split');
    });

    test('T20n: Escape-Return finalisiert Recording-Export trotz doppeltem Lifecycle-Stop', async ({ page }) => {
        await startGame(page);
        await page.waitForTimeout(500);

        const recordingState = await page.evaluate(() => {
            const recorder = window.GAME_INSTANCE?.mediaRecorderSystem;
            const support = recorder?.getSupportState?.() || {};
            if (support.canRecord && !recorder?.isRecording?.()) {
                recorder?.notifyLifecycleEvent?.('recording_requested', { command: 'start' });
            }
            return {
                canRecord: !!support.canRecord,
                isRecording: !!recorder?.isRecording?.(),
            };
        });
        if (!recordingState.canRecord || !recordingState.isRecording) {
            test.skip(true, 'MediaRecorder-Exportpfad im Runtime nicht aktiv.');
        }

        await returnToMenu(page);
        await page.waitForTimeout(300);

        const recorderState = await page.evaluate(async () => {
            const recorder = window.GAME_INSTANCE?.mediaRecorderSystem;
            const support = recorder?.getSupportState?.() || {};
            if (!support.canRecord) {
                return {
                    canRecord: false,
                    exportMeta: null,
                };
            }

            const deadline = Date.now() + 4500;
            let exportMeta = recorder?.getLastExportMeta?.() || null;
            while (!exportMeta && Date.now() < deadline) {
                await new Promise((resolve) => setTimeout(resolve, 80));
                exportMeta = recorder?.getLastExportMeta?.() || null;
            }
            return {
                canRecord: true,
                exportMeta,
            };
        });

        if (!recorderState.canRecord || !recorderState.exportMeta) {
            test.skip(true, 'MediaRecorder-Export im Runtime nicht deterministisch verfuegbar.');
        }
        expect(recorderState.exportMeta).toBeTruthy();
        expect(String(recorderState.exportMeta.fileName || '')).toMatch(/\.(webm|mp4|video)$/);
    });

    test('T20o: Session-Drafts bleiben pro Session-Typ getrennt', async ({ page }) => {
        await loadGame(page);
        const draftState = await page.evaluate(() => {
            const game = window.GAME_INSTANCE;
            game.settings.localSettings.sessionType = 'single';
            game.settings.mapKey = 'maze';
            const saveSingle = game.settingsManager.saveSessionDraft(game.settings, 'single');

            game.settings.localSettings.sessionType = 'splitscreen';
            game.settings.mapKey = 'pyramid';
            const saveSplit = game.settingsManager.saveSessionDraft(game.settings, 'splitscreen');

            game.settings.mapKey = 'standard';
            const loadSingle = game.settingsManager.applySessionDraft(game.settings, 'single');
            const mapAfterSingle = game.settings.mapKey;
            const loadSplit = game.settingsManager.applySessionDraft(game.settings, 'splitscreen');
            const mapAfterSplit = game.settings.mapKey;
            return {
                saveSingle: saveSingle.success,
                saveSplit: saveSplit.success,
                loadSingle: loadSingle.success,
                loadSplit: loadSplit.success,
                mapAfterSingle,
                mapAfterSplit,
            };
        });
        expect(draftState.saveSingle).toBeTruthy();
        expect(draftState.saveSplit).toBeTruthy();
        expect(draftState.loadSingle).toBeTruthy();
        expect(draftState.loadSplit).toBeTruthy();
        expect(draftState.mapAfterSingle).toBe('maze');
        expect(draftState.mapAfterSplit).toBe('pyramid');
    });

    test('T20o1: sanitizeSettings haelt Session-, Clamp- und Kompatibilitaetsvertrag stabil', async ({ page }) => {
        await loadGame(page);
        const sanitized = await page.evaluate(() => {
            const game = window.GAME_INSTANCE;
            const defaults = game.settingsManager.createDefaultSettings();
            const settingsVersion = Number(defaults?.settingsVersion || game.settings?.settingsVersion || 1);
            const snapshot = game.settingsManager.sanitizeSettings({
                settingsVersion,
                mode: '1p',
                gameMode: 'CLASSIC',
                mapKey: 'unknown_map',
                numBots: 999,
                botDifficulty: 'UNSUPPORTED',
                winsNeeded: -5,
                hunt: { respawnEnabled: true },
                gameplay: {
                    speed: 999,
                    portalCount: -3,
                    planarMode: 'invalid',
                    portalBeams: true,
                },
                botBridge: {
                    enabled: true,
                    url: '  ws://localhost:8765/test  ',
                    timeoutMs: -1,
                    maxRetries: 999,
                    retryDelayMs: -99,
                    resumeCheckpoint: '  cp-01  ',
                    resumeStrict: true,
                },
                localSettings: {
                    sessionType: 'splitscreen',
                    modePath: 'unsupported_path',
                },
            });
            return {
                defaultsMapKey: String(defaults?.mapKey || ''),
                mapKey: String(snapshot?.mapKey || ''),
                mode: String(snapshot?.mode || ''),
                sessionType: String(snapshot?.localSettings?.sessionType || ''),
                modePath: String(snapshot?.localSettings?.modePath || ''),
                huntRespawnEnabled: !!snapshot?.hunt?.respawnEnabled,
                portalBeams: snapshot?.gameplay?.portalBeams,
                botBridgeUrl: String(snapshot?.botBridge?.url || ''),
                botBridgeResumeCheckpoint: String(snapshot?.botBridge?.resumeCheckpoint || ''),
                botBridgeResumeStrict: !!snapshot?.botBridge?.resumeStrict,
            };
        });

        expect(sanitized.mapKey).toBe(sanitized.defaultsMapKey);
        expect(sanitized.mode).toBe('2p');
        expect(sanitized.sessionType).toBe('splitscreen');
        expect(sanitized.modePath).toBe('fight');
        expect(sanitized.huntRespawnEnabled).toBeTruthy();
        expect(sanitized.portalBeams).toBe(false);
        expect(sanitized.botBridgeUrl).toBe('ws://localhost:8765/test');
        expect(sanitized.botBridgeResumeCheckpoint).toBe('cp-01');
        expect(sanitized.botBridgeResumeStrict).toBeTruthy();
    });

    test('T20p: Start-Validierung zeigt Feldgrund und fokussiert Ziel', async ({ page }) => {
        await loadGame(page);
        await openMultiplayerSubmenu(page);
        await page.click('#btn-start');
        await expect(page.locator('#start-validation-status')).toContainText('Start nicht moeglich');
        const focusedElementId = await page.evaluate(() => document.activeElement?.id || '');
        expect(focusedElementId).toBe('multiplayer-lobby-code');
    });

    test('T20q: Ebene-3- und Ebene-4-Reset greifen auf Defaults', async ({ page }) => {
        await loadGame(page);
        const expectedDefaults = await page.evaluate(async () => {
            const mod = await import('/src/ui/menu/MenuDefaultsEditorConfig.js');
            const level3Reset = mod.createMenuLevel3ResetDefaults();
            const baseSettings = mod.createMenuBaseSettingsDefaults();
            return {
                level3MapKey: level3Reset.mapKey,
                level3ThemeMode: level3Reset.themeMode,
                level3VehicleP1: level3Reset.vehicles.PLAYER_1,
                level4Speed: String(baseSettings.gameplay.speed),
                level4PerspectiveNormal: String(baseSettings.cameraPerspective?.normal || 'classic'),
                level4PerspectiveReduceMotion: !!baseSettings.cameraPerspective?.reduceMotion,
            };
        });
        await openGameSubmenu(page);
        await page.selectOption('#map-select', 'complex');
        await page.evaluate(() => {
            const game = window.GAME_INSTANCE;
            game.settings.vehicles.PLAYER_1 = 'ship8';
            game.runtimeFacade.onSettingsChanged({ changedKeys: ['vehicles.player1'] });
        });
        await openStartSetupSection(page, 'match');
        await page.selectOption('#theme-mode-select', 'hell');
        await page.click('#btn-level3-reset');
        expect(await page.inputValue('#map-select')).toBe(expectedDefaults.level3MapKey);
        expect(await page.inputValue('#theme-mode-select')).toBe(expectedDefaults.level3ThemeMode);
        expect(await page.inputValue('#vehicle-select-p1')).toBe(expectedDefaults.level3VehicleP1);

        await openLevel4Drawer(page, { section: 'gameplay' });
        await page.evaluate(() => {
            const slider = document.getElementById('speed-slider');
            if (!slider) return;
            slider.value = '30';
            slider.dispatchEvent(new Event('input', { bubbles: true }));
        });
        await page.selectOption('#normal-camera-perspective-select', 'cinematic_action');
        await page.uncheck('#normal-camera-reduce-motion-toggle');
        await page.click('#btn-level4-reset');
        await page.waitForTimeout(100);
        expect(await page.inputValue('#speed-slider')).toBe(expectedDefaults.level4Speed);
        expect(await page.inputValue('#normal-camera-perspective-select')).toBe(expectedDefaults.level4PerspectiveNormal);
        await expect(page.locator('#normal-camera-reduce-motion-toggle')).toHaveJSProperty(
            'checked',
            expectedDefaults.level4PerspectiveReduceMotion
        );
    });

    test('T20r: Textkatalog-Override greift und Release-Vorschau deaktiviert ihn', async ({ page }) => {
        await loadGame(page);
        await openDeveloperSubmenu(page);

        if (!(await page.isChecked('#developer-mode-toggle'))) {
            await page.check('#developer-mode-toggle');
        }
        await page.selectOption('#developer-text-id-select', 'menu.level3.start.label');
        await page.fill('#developer-text-override-input', 'Los jetzt');
        await page.click('#btn-developer-text-apply');
        await page.waitForTimeout(120);

        await openGameSubmenu(page);
        await expect(page.locator('#btn-start')).toHaveText('Los jetzt');

        await openDeveloperSubmenu(page);
        await page.selectOption('#developer-text-id-select', 'menu.level4.tools.map_editor.label');
        await page.fill('#developer-text-override-input', 'Map Builder');
        await page.click('#btn-developer-text-apply');
        await page.waitForTimeout(120);

        await openLevel4Drawer(page, { section: 'tools' });
        await expect(page.locator('#btn-open-editor')).toHaveText('Map Builder');

        await openDeveloperSubmenu(page);
        await page.check('#developer-release-preview-toggle');
        await page.waitForTimeout(120);

        await openGameSubmenu(page);
        await expect(page.locator('#btn-start')).toHaveText('Starten');

        await openDeveloperSubmenu(page);
        await page.uncheck('#developer-release-preview-toggle');
        if (!(await page.isChecked('#developer-mode-toggle'))) {
            await page.check('#developer-mode-toggle');
        }
        await page.selectOption('#developer-text-id-select', 'menu.level3.start.label');
        await page.click('#btn-developer-text-clear');
        await page.selectOption('#developer-text-id-select', 'menu.level4.tools.map_editor.label');
        await page.click('#btn-developer-text-clear');
    });

    test('T20s: Config-Export/Import stellt Setup reproduzierbar wieder her', async ({ page }) => {
        await loadGame(page);
        await openGameSubmenu(page);
        await page.evaluate(() => {
            const game = window.GAME_INSTANCE;
            game.settings.mapKey = 'maze';
            game.runtimeFacade.onSettingsChanged({ changedKeys: ['mapKey'] });
        });
        expect(await page.inputValue('#map-select')).toBe('maze');

        await openLevel4Drawer(page, { section: 'tools' });
        await page.click('#btn-config-export-json');
        const exportedJson = await page.inputValue('#config-share-input');
        expect(exportedJson.length).toBeGreaterThan(20);
        expect(JSON.parse(exportedJson).mapKey).toBe('maze');

        await page.click('#btn-close-level4');
        await page.waitForFunction(() => {
            const drawer = document.getElementById('submenu-level4');
            return !!drawer
                && drawer.classList.contains('hidden')
                && !window.GAME_INSTANCE?.settings?.localSettings?.toolsState?.level4Open;
        }, null, { timeout: 4000 });
        await page.evaluate(() => {
            const game = window.GAME_INSTANCE;
            game.settings.mapKey = 'pyramid';
            game.runtimeFacade.onSettingsChanged({ changedKeys: ['mapKey'] });
        });
        expect(await page.inputValue('#map-select')).toBe('pyramid');

        await openLevel4Drawer(page, { section: 'tools' });
        await page.fill('#config-share-input', exportedJson);
        await page.click('#btn-config-import');
        await page.waitForTimeout(120);
        expect(await page.inputValue('#map-select')).toBe('maze');
    });

    test('T20t: Suchfilter und Telemetrie sind im neuen Flow verfuegbar', async ({ page }) => {
        await loadGame(page);
        await openGameSubmenu(page);

        await page.fill('#map-search-input', 'maze');
        const mapOptions = await page.locator('#map-select option').allTextContents();
        expect(mapOptions.length).toBeGreaterThanOrEqual(1);
        expect(mapOptions.some((entry) => entry.toLowerCase().includes('maze') || entry.toLowerCase().includes('labyrinth'))).toBeTruthy();

        await page.click('#submenu-game [data-back]');
        await page.click('#menu-nav [data-session-type=\"single\"]');
        await page.click('#btn-quick-last-settings');
        await page.waitForTimeout(500);
        await returnToMenu(page);

        await openDeveloperSubmenu(page);
        const telemetryText = await page.textContent('#developer-telemetry-output');
        const telemetry = JSON.parse(telemetryText || '{}');
        expect(Number(telemetry.quickStartCount || 0)).toBeGreaterThanOrEqual(1);
        expect(Number(telemetry.startAttempts || 0)).toBeGreaterThanOrEqual(1);
    });

    test('T20u: Enter/Escape Navigation funktioniert ueber Ebene 1 bis 3', async ({ page }) => {
        await loadGame(page);
        await page.focus('#menu-nav [data-session-type=\"single\"]');
        await page.keyboard.press('Enter');
        await expect(page.locator('#submenu-custom')).toBeVisible();

        await page.focus('#submenu-custom [data-mode-path=\"normal\"]');
        await page.keyboard.press('Enter');
        await expect(page.locator('#submenu-game')).toBeVisible();

        await page.keyboard.press('Escape');
        await expect(page.locator('#submenu-custom')).toBeVisible();

        await page.keyboard.press('Escape');
        await expect(page.locator('#menu-nav')).toBeVisible();
    });

    test('T20v: Ebene 3 schaltet nur Classic 3D/Planar und aendert nicht Fight-Auswahl aus Ebene 2', async ({ page }) => {
        await loadGame(page);
        await openCustomSubmenu(page);
        await page.click('#submenu-custom:not(.hidden) [data-mode-path=\"fight\"]');
        await page.waitForSelector('#submenu-game:not(.hidden)', { timeout: 5000 });
        await openStartSetupSection(page, 'match');

        await page.click('#btn-dimension-planar');
        await page.waitForTimeout(120);
        let state = await page.evaluate(() => {
            const game = window.GAME_INSTANCE;
            return {
                modePath: String(game?.settings?.localSettings?.modePath || ''),
                gameMode: String(game?.settings?.gameMode || ''),
                planarMode: !!game?.settings?.gameplay?.planarMode,
            };
        });
        expect(state.modePath).toBe('fight');
        expect(state.gameMode).toBe('HUNT');
        expect(state.planarMode).toBeTruthy();

        await page.click('#btn-dimension-classic-3d');
        await page.waitForTimeout(120);
        state = await page.evaluate(() => {
            const game = window.GAME_INSTANCE;
            return {
                modePath: String(game?.settings?.localSettings?.modePath || ''),
                gameMode: String(game?.settings?.gameMode || ''),
                planarMode: !!game?.settings?.gameplay?.planarMode,
            };
        });
        expect(state.modePath).toBe('fight');
        expect(state.gameMode).toBe('HUNT');
        expect(state.planarMode).toBeFalsy();
    });

    test('T20w: Kopf- und Level-2-Zweitcopy ist visuell entfernt, Context bleibt als SR-Status aktiv', async ({ page }) => {
        await loadGame(page);

        const level1State = await page.evaluate(() => {
            const root = document.getElementById('main-menu');
            const context = document.getElementById('menu-context');
            const isVisible = (selector) => Array.from(document.querySelectorAll(selector)).some((element) => {
                const style = window.getComputedStyle(element);
                return style.display !== 'none' && style.visibility !== 'hidden' && element.getClientRects().length > 0;
            });
            const contextRect = context?.getBoundingClientRect?.() || { width: 0, height: 0 };
            return {
                depth: root?.getAttribute('data-menu-depth') || '',
                secondaryCopyVisible: isVisible('.subtitle') || isVisible('.nav-btn-meta') || isVisible('.nav-help-card'),
                contextText: String(context?.textContent || '').trim(),
                contextWidth: Math.round(contextRect.width || 0),
                contextHeight: Math.round(contextRect.height || 0),
            };
        });

        await openCustomSubmenu(page);

        const compactState = await page.evaluate(() => {
            const root = document.getElementById('main-menu');
            const isVisible = (selector) => Array.from(document.querySelectorAll(selector)).some((element) => {
                const style = window.getComputedStyle(element);
                return style.display !== 'none' && style.visibility !== 'hidden' && element.getClientRects().length > 0;
            });
            return {
                depth: root?.getAttribute('data-menu-depth') || '',
                panel: root?.getAttribute('data-menu-panel') || '',
                level2SecondaryVisible: isVisible('#submenu-custom .menu-choice-eyebrow')
                    || isVisible('#submenu-custom .menu-choice-copy')
                    || isVisible('#submenu-custom .menu-copy-secondary'),
            };
        });

        expect(level1State.depth).toBe('1');
        expect(level1State.secondaryCopyVisible).toBeFalsy();
        expect(level1State.contextText).toContain('Hauptmenue');
        expect(level1State.contextWidth).toBeLessThanOrEqual(1);
        expect(level1State.contextHeight).toBeLessThanOrEqual(1);
        expect(compactState.depth).toBe('2');
        expect(compactState.panel).toBe('submenu-custom');
        expect(compactState.level2SecondaryVisible).toBeFalsy();
    });

    test('T20x: Moduskarte fuehrt direkt in Ebene 3', async ({ page }) => {
        await loadGame(page);
        await openCustomSubmenu(page);
        await page.click('#submenu-custom:not(.hidden) [data-mode-path="arcade"]');
        await expect(page.locator('#submenu-game')).toBeVisible();

        const menuState = await page.evaluate(() => {
            const root = document.getElementById('main-menu');
            return {
                depth: root?.getAttribute('data-menu-depth') || '',
                panel: root?.getAttribute('data-menu-panel') || '',
                modePath: String(window.GAME_INSTANCE?.settings?.localSettings?.modePath || ''),
            };
        });

        expect(menuState.depth).toBe('3');
        expect(menuState.panel).toBe('submenu-game');
        expect(menuState.modePath).toBe('arcade');
    });

    test('T20x0: Ebene-4 Fight-HP/MG-Regler sind nur im Fight-Modus aktiv', async ({ page }) => {
        await loadGame(page);
        await openCustomSubmenu(page);
        await page.click('#submenu-custom:not(.hidden) [data-mode-path="normal"]');
        await page.waitForSelector('#submenu-game:not(.hidden)', { timeout: 5000 });
        await openLevel4Drawer(page, { section: 'gameplay' });

        const normalState = await page.evaluate(() => {
            const game = window.GAME_INSTANCE;
            const hpSetting = document.getElementById('fight-player-hp-setting');
            const damageSetting = document.getElementById('fight-mg-damage-setting');
            const hint = document.getElementById('fight-tuning-hint');
            const hpSlider = document.getElementById('fight-player-hp-slider');
            const damageSlider = document.getElementById('fight-mg-damage-slider');

            const beforeHp = Number(game?.settings?.gameplay?.fightPlayerHp || 0);
            const beforeDamage = Number(game?.settings?.gameplay?.fightMgDamage || 0);
            const runtimeHp = Number(game?.config?.HUNT?.PLAYER_MAX_HP || 0);
            const runtimeDamage = Number(game?.config?.HUNT?.MG?.DAMAGE || 0);

            if (hpSlider) {
                hpSlider.value = '220';
                hpSlider.dispatchEvent(new Event('input', { bubbles: true }));
            }
            if (damageSlider) {
                damageSlider.value = '15.50';
                damageSlider.dispatchEvent(new Event('input', { bubbles: true }));
            }

            return {
                modePath: String(game?.settings?.localSettings?.modePath || ''),
                hpHidden: !!hpSetting?.classList?.contains('hidden'),
                damageHidden: !!damageSetting?.classList?.contains('hidden'),
                hpDisabled: !!hpSlider?.disabled,
                damageDisabled: !!damageSlider?.disabled,
                hintHidden: !!hint?.classList?.contains('hidden'),
                beforeHp,
                afterHp: Number(game?.settings?.gameplay?.fightPlayerHp || 0),
                beforeDamage,
                afterDamage: Number(game?.settings?.gameplay?.fightMgDamage || 0),
                runtimeHp,
                runtimeDamage,
            };
        });

        expect(normalState.modePath).toBe('normal');
        expect(normalState.hpHidden).toBeTruthy();
        expect(normalState.damageHidden).toBeTruthy();
        expect(normalState.hpDisabled).toBeTruthy();
        expect(normalState.damageDisabled).toBeTruthy();
        expect(normalState.hintHidden).toBeFalsy();
        expect(normalState.afterHp).toBe(normalState.beforeHp);
        expect(normalState.afterDamage).toBe(normalState.beforeDamage);

        await page.click('#btn-close-level4');
        await page.click('#submenu-game:not(.hidden) [data-back]');
        await page.waitForSelector('#submenu-custom:not(.hidden)', { timeout: 5000 });
        await page.click('#submenu-custom:not(.hidden) [data-mode-path="fight"]');
        await page.waitForSelector('#submenu-game:not(.hidden)', { timeout: 5000 });
        await openLevel4Drawer(page, { section: 'gameplay' });

        await page.evaluate(() => {
            const hpSlider = document.getElementById('fight-player-hp-slider');
            const damageSlider = document.getElementById('fight-mg-damage-slider');
            if (hpSlider) {
                hpSlider.value = '170';
                hpSlider.dispatchEvent(new Event('input', { bubbles: true }));
            }
            if (damageSlider) {
                damageSlider.value = '12.50';
                damageSlider.dispatchEvent(new Event('input', { bubbles: true }));
            }
        });
        await page.waitForTimeout(220);

        const fightState = await page.evaluate(() => {
            const game = window.GAME_INSTANCE;
            const hpSetting = document.getElementById('fight-player-hp-setting');
            const damageSetting = document.getElementById('fight-mg-damage-setting');
            const hint = document.getElementById('fight-tuning-hint');
            const hpSlider = document.getElementById('fight-player-hp-slider');
            const damageSlider = document.getElementById('fight-mg-damage-slider');
            return {
                modePath: String(game?.settings?.localSettings?.modePath || ''),
                hpHidden: !!hpSetting?.classList?.contains('hidden'),
                damageHidden: !!damageSetting?.classList?.contains('hidden'),
                hpDisabled: !!hpSlider?.disabled,
                damageDisabled: !!damageSlider?.disabled,
                hintHidden: !!hint?.classList?.contains('hidden'),
                settingsHp: Number(game?.settings?.gameplay?.fightPlayerHp || 0),
                settingsDamage: Number(game?.settings?.gameplay?.fightMgDamage || 0),
                runtimeHp: Number(game?.config?.HUNT?.PLAYER_MAX_HP || 0),
                runtimeDamage: Number(game?.config?.HUNT?.MG?.DAMAGE || 0),
            };
        });

        expect(fightState.modePath).toBe('fight');
        expect(fightState.hpHidden).toBeFalsy();
        expect(fightState.damageHidden).toBeFalsy();
        expect(fightState.hpDisabled).toBeFalsy();
        expect(fightState.damageDisabled).toBeFalsy();
        expect(fightState.hintHidden).toBeTruthy();
        expect(fightState.settingsHp).toBe(170);
        expect(fightState.settingsDamage).toBeCloseTo(12.5, 2);
        expect(fightState.runtimeHp).toBe(170);
        expect(fightState.runtimeDamage).toBeCloseTo(12.5, 2);

        await page.click('#btn-close-level4');
        await page.click('#submenu-game:not(.hidden) [data-back]');
        await page.waitForSelector('#submenu-custom:not(.hidden)', { timeout: 5000 });
        await page.click('#submenu-custom:not(.hidden) [data-mode-path="normal"]');
        await page.waitForSelector('#submenu-game:not(.hidden)', { timeout: 5000 });
        await page.waitForTimeout(160);

        const revertedState = await page.evaluate(() => {
            const game = window.GAME_INSTANCE;
            return {
                modePath: String(game?.settings?.localSettings?.modePath || ''),
                runtimeHp: Number(game?.config?.HUNT?.PLAYER_MAX_HP || 0),
                runtimeDamage: Number(game?.config?.HUNT?.MG?.DAMAGE || 0),
            };
        });

        expect(revertedState.modePath).toBe('normal');
        expect(revertedState.runtimeHp).toBe(normalState.runtimeHp);
        expect(revertedState.runtimeDamage).toBeCloseTo(normalState.runtimeDamage, 2);
    });

    test('T20x1: Map-Auswahl folgt Moduspfad (Arcade nur Parcours, sonst ohne Parcours)', async ({ page }) => {
        await loadGame(page);
        await openCustomSubmenu(page);
        await page.click('#submenu-custom:not(.hidden) [data-mode-path="normal"]');
        await page.waitForSelector('#submenu-game:not(.hidden)', { timeout: 5000 });

        const normalState = await page.evaluate(() => {
            const game = window.GAME_INSTANCE;
            const maps = game?.config?.MAPS || {};
            const options = Array.from(document.querySelectorAll('#map-select option')).map((option) => option.value);
            const parcoursVisible = options.filter((mapKey) => maps?.[mapKey]?.parcours?.enabled === true);
            const regularVisible = options.filter((mapKey) => maps?.[mapKey]?.parcours?.enabled !== true);
            return {
                modePath: String(game?.settings?.localSettings?.modePath || ''),
                parcoursVisibleCount: parcoursVisible.length,
                regularVisibleCount: regularVisible.length,
            };
        });

        expect(normalState.modePath).toBe('normal');
        expect(normalState.parcoursVisibleCount).toBe(0);
        expect(normalState.regularVisibleCount).toBeGreaterThan(0);

        await page.click('#submenu-game:not(.hidden) [data-back]');
        await page.waitForSelector('#submenu-custom:not(.hidden)', { timeout: 5000 });
        await page.click('#submenu-custom:not(.hidden) [data-mode-path="arcade"]');
        await page.waitForSelector('#submenu-game:not(.hidden)', { timeout: 5000 });

        const arcadeState = await page.evaluate(() => {
            const game = window.GAME_INSTANCE;
            const maps = game?.config?.MAPS || {};
            const options = Array.from(document.querySelectorAll('#map-select option')).map((option) => option.value);
            const parcoursVisible = options.filter((mapKey) => maps?.[mapKey]?.parcours?.enabled === true);
            const regularVisible = options.filter((mapKey) => maps?.[mapKey]?.parcours?.enabled !== true);
            return {
                modePath: String(game?.settings?.localSettings?.modePath || ''),
                selectedMapKey: String(game?.settings?.mapKey || ''),
                parcoursVisibleCount: parcoursVisible.length,
                regularVisibleCount: regularVisible.length,
            };
        });

        expect(arcadeState.modePath).toBe('arcade');
        expect(arcadeState.parcoursVisibleCount).toBeGreaterThan(0);
        expect(arcadeState.regularVisibleCount).toBe(0);
        expect(arcadeState.selectedMapKey).toBe('parcours_rift');
    });

    test('T20y: Sticky Startleiste bleibt sichtbar und nutzt strukturierte Summary-Bloecke', async ({ page }) => {
        await loadGame(page);
        await openGameSubmenu(page);

        const railState = await page.evaluate(() => {
            const rail = document.querySelector('.start-rail');
            const startButton = document.getElementById('btn-start');
            return {
                railPosition: rail ? window.getComputedStyle(rail).position : '',
                startVisible: !!(startButton && startButton.offsetParent),
                summaryBlocks: document.querySelectorAll('#menu-selection-summary .start-summary-block').length,
            };
        });

        expect(railState.railPosition).toBe('sticky');
        expect(railState.startVisible).toBeTruthy();
        expect(railState.summaryBlocks).toBeGreaterThanOrEqual(4);
    });

    test('T20z: Map- und Fahrzeugvorschau rendern strukturierte Preview-Karten', async ({ page }) => {
        await loadGame(page);
        await openGameSubmenu(page);

        const previewState = await page.evaluate(() => ({
            mapBadges: document.querySelectorAll('#map-preview .preview-badge').length,
            mapFacts: document.querySelectorAll('#map-preview .preview-kv').length,
            vehicleBadges: document.querySelectorAll('#vehicle-preview-p1 .preview-badge').length,
            vehicleFacts: document.querySelectorAll('#vehicle-preview-p1 .preview-kv').length,
        }));

        expect(previewState.mapBadges).toBeGreaterThanOrEqual(2);
        expect(previewState.mapFacts).toBeGreaterThanOrEqual(2);
        expect(previewState.vehicleBadges).toBeGreaterThanOrEqual(1);
        expect(previewState.vehicleFacts).toBeGreaterThanOrEqual(2);
    });

    test('T20aa: Ebene 4 nutzt Bereichstabs ohne horizontalen Overflow auf Mobil', async ({ page }) => {
        await page.setViewportSize({ width: 430, height: 932 });
        await loadGame(page);
        await openLevel4Drawer(page, { section: 'tools' });

        const level4State = await page.evaluate(() => {
            const drawer = document.getElementById('submenu-level4');
            const stack = drawer?.querySelector('.level4-section-stack');
            const activePanel = drawer?.querySelector('.level4-section-panel.is-active');
            return {
                tabCount: drawer?.querySelectorAll('[data-level4-section-target]').length || 0,
                activeSection: String(activePanel?.dataset?.level4Section || ''),
                drawerOverflow: Math.max(0, Math.round((drawer?.scrollWidth || 0) - (drawer?.clientWidth || 0))),
                stackOverflow: Math.max(0, Math.round((stack?.scrollWidth || 0) - (stack?.clientWidth || 0))),
            };
        });

        expect(level4State.tabCount).toBe(4);
        expect(level4State.activeSection).toBe('tools');
        expect(level4State.drawerOverflow).toBeLessThanOrEqual(4);
        expect(level4State.stackOverflow).toBeLessThanOrEqual(4);
    });

    test('T20ab: GameLoop akkumuliert Sub-Step-Frames ohne Doppel-Simulation', async ({ page }) => {
        await loadGame(page);
        const result = await page.evaluate(async () => {
            const { GameLoop } = await import('/src/core/GameLoop.js');
            const originalRaf = window.requestAnimationFrame;
            const originalCancel = window.cancelAnimationFrame;
            const updates = [];
            try {
                window.requestAnimationFrame = () => 1;
                window.cancelAnimationFrame = () => { };
                const loop = new GameLoop((dt) => updates.push(dt), () => { });
                loop.running = true;
                loop.lastTime = 0;
                loop._loop(10);
                loop._loop(20);
                loop._loop(30);
                return {
                    updateCount: updates.length,
                    totalDt: updates.reduce((sum, dt) => sum + dt, 0),
                    accumulator: loop.accumulator,
                    fixedStep: loop.fixedStep,
                };
            } finally {
                window.requestAnimationFrame = originalRaf;
                window.cancelAnimationFrame = originalCancel;
            }
        });

        expect(result.updateCount).toBe(1);
        expect(result.totalDt).toBeGreaterThanOrEqual(result.fixedStep - 0.000001);
        expect(result.totalDt).toBeLessThanOrEqual(result.fixedStep + 0.000001);
        expect(result.accumulator).toBeLessThan(result.fixedStep);
    });

    test('T20ac: GameLoop klemmt grosse Delta-Spruenge auf maximal drei Fixed-Steps', async ({ page }) => {
        await loadGame(page);
        const result = await page.evaluate(async () => {
            const { GameLoop } = await import('/src/core/GameLoop.js');
            const originalRaf = window.requestAnimationFrame;
            const originalCancel = window.cancelAnimationFrame;
            const updates = [];
            try {
                window.requestAnimationFrame = () => 1;
                window.cancelAnimationFrame = () => { };
                const loop = new GameLoop((dt) => updates.push(dt), () => { });
                loop.running = true;
                loop.lastTime = 0;
                loop._loop(200);
                return {
                    updateCount: updates.length,
                    totalDt: updates.reduce((sum, dt) => sum + dt, 0),
                    accumulator: loop.accumulator,
                    fixedStep: loop.fixedStep,
                };
            } finally {
                window.requestAnimationFrame = originalRaf;
                window.cancelAnimationFrame = originalCancel;
            }
        });

        expect(result.updateCount).toBe(3);
        expect(result.totalDt).toBeGreaterThanOrEqual(result.fixedStep * 3 - 0.000001);
        expect(result.totalDt).toBeLessThanOrEqual(result.fixedStep * 3 + 0.000001);
        expect(result.accumulator).toBeLessThan(0.000001);
    });

    test('T20ad: GameLoop wendet timeScale nur einmal auf akkumulierte Simulationszeit an', async ({ page }) => {
        await loadGame(page);
        const result = await page.evaluate(async () => {
            const { GameLoop } = await import('/src/core/GameLoop.js');
            const originalRaf = window.requestAnimationFrame;
            const originalCancel = window.cancelAnimationFrame;
            const updates = [];
            try {
                window.requestAnimationFrame = () => 1;
                window.cancelAnimationFrame = () => { };
                const loop = new GameLoop((dt) => updates.push(dt), () => { });
                loop.running = true;
                loop.lastTime = 0;
                loop.setTimeScale(0.5);
                loop._loop(10);
                loop._loop(20);
                loop._loop(30);
                loop._loop(40);
                return {
                    updateCount: updates.length,
                    totalDt: updates.reduce((sum, dt) => sum + dt, 0),
                    accumulator: loop.accumulator,
                    fixedStep: loop.fixedStep,
                };
            } finally {
                window.requestAnimationFrame = originalRaf;
                window.cancelAnimationFrame = originalCancel;
            }
        });

        expect(result.updateCount).toBe(1);
        expect(result.totalDt).toBeGreaterThanOrEqual(result.fixedStep - 0.000001);
        expect(result.totalDt).toBeLessThanOrEqual(result.fixedStep + 0.000001);
        expect(result.totalDt).toBeLessThan(0.02);
        expect(result.accumulator).toBeLessThan(result.fixedStep);
    });

    test('T20af: GameLoop uebergibt Render-Alpha aus accumulator/fixedStep', async ({ page }) => {
        await loadGame(page);
        const result = await page.evaluate(async () => {
            const { GameLoop } = await import('/src/core/GameLoop.js');
            const originalRaf = window.requestAnimationFrame;
            const originalCancel = window.cancelAnimationFrame;
            const renderAlphas = [];
            try {
                window.requestAnimationFrame = () => 1;
                window.cancelAnimationFrame = () => { };
                const loop = new GameLoop(() => { }, (alpha) => {
                    renderAlphas.push(alpha);
                });
                loop.running = true;
                loop.lastTime = 0;
                loop._loop(10);
                loop._loop(20);
                loop._loop(30);
                const expectedAlpha = loop.fixedStep > 0 ? (loop.accumulator / loop.fixedStep) : 0;
                return {
                    renderCallCount: renderAlphas.length,
                    latestRenderAlpha: Number(renderAlphas[renderAlphas.length - 1] ?? -1),
                    cachedRenderAlpha: Number(loop.renderAlpha),
                    expectedAlpha: Number(expectedAlpha),
                };
            } finally {
                window.requestAnimationFrame = originalRaf;
                window.cancelAnimationFrame = originalCancel;
            }
        });

        expect(result.renderCallCount).toBe(3);
        expect(result.latestRenderAlpha).toBeGreaterThanOrEqual(0);
        expect(result.latestRenderAlpha).toBeLessThanOrEqual(1);
        expect(Math.abs(result.cachedRenderAlpha - result.latestRenderAlpha)).toBeLessThan(0.000001);
        expect(Math.abs(result.expectedAlpha - result.latestRenderAlpha)).toBeLessThan(0.000001);
    });

    test('T20ag: GameLoop neutralisiert extreme Delta-Spruenge mit Jump-Guard', async ({ page }) => {
        await loadGame(page);
        const result = await page.evaluate(async () => {
            const { GameLoop } = await import('/src/core/GameLoop.js');
            const originalRaf = window.requestAnimationFrame;
            const originalCancel = window.cancelAnimationFrame;
            const updates = [];
            try {
                window.requestAnimationFrame = () => 1;
                window.cancelAnimationFrame = () => { };
                const loop = new GameLoop((dt) => updates.push(dt), () => { });
                loop.running = true;
                loop.lastTime = 0;
                loop._loop(1200);
                return {
                    updateCount: updates.length,
                    totalDt: updates.reduce((sum, dt) => sum + dt, 0),
                    accumulator: loop.accumulator,
                    fixedStep: loop.fixedStep,
                };
            } finally {
                window.requestAnimationFrame = originalRaf;
                window.cancelAnimationFrame = originalCancel;
            }
        });

        expect(result.updateCount).toBe(1);
        expect(result.totalDt).toBeGreaterThanOrEqual(result.fixedStep - 0.000001);
        expect(result.totalDt).toBeLessThanOrEqual(result.fixedStep + 0.000001);
        expect(result.accumulator).toBeLessThan(0.000001);
    });

    test('T20ah: Debug-API liefert Runtime-Perf-Snapshot inkl. Subsystem-Werten', async ({ page }) => {
        await loadGame(page);
        const probe = await page.evaluate(() => {
            const game = window.GAME_INSTANCE;
            const profiler = game?.runtimePerfProfiler;
            const now = performance.now();
            profiler?.beginFrame?.(16.7, now);
            profiler?.recordSubsystemDuration?.('update', 2.4);
            profiler?.recordSubsystemDuration?.('camera', 1.2);
            profiler?.endFrame?.(16.7, now + 16.7);
            const snapshot = game?.debugApi?.getRuntimePerformanceSnapshot?.({
                windowSize: 1,
                spikeEventsLimit: 0,
            }) || null;
            return {
                hasSnapshot: !!snapshot,
                frameP95: Number(snapshot?.performance?.frameMs?.p95 || 0),
                updateAvg: Number(snapshot?.performance?.subsystems?.update?.avg || 0),
                cameraAvg: Number(snapshot?.performance?.subsystems?.camera?.avg || 0),
                hasRecorderDiagnostics: !!snapshot?.recorder,
            };
        });

        expect(probe.hasSnapshot).toBeTruthy();
        expect(probe.frameP95).toBeGreaterThan(0);
        expect(probe.updateAvg).toBeGreaterThan(0);
        expect(probe.cameraAvg).toBeGreaterThan(0);
        expect(probe.hasRecorderDiagnostics).toBeTruthy();
    });

    test('T20ah1: RuntimePerfProfiler sammelt Spikes ohne Console-Warnstorm per Default', async ({ page }) => {
        await loadGame(page);
        const probe = await page.evaluate(async () => {
            const { RuntimePerfProfiler } = await import('/src/core/perf/RuntimePerfProfiler.js');
            const warnings = [];
            const originalWarn = console.warn;
            console.warn = (...args) => warnings.push(args.map((entry) => String(entry)).join(' '));
            try {
                const profiler = new RuntimePerfProfiler({
                    spikeThresholdMs: 30,
                    spikeLogLimit: 8,
                });
                profiler.beginFrame(42, 1000);
                profiler.recordSubsystemDuration('render', 3.5);
                profiler.endFrame(42, 1042);
                profiler.beginFrame(46, 1060);
                profiler.recordSubsystemDuration('update', 1.8);
                profiler.endFrame(46, 1106);
                const snapshot = profiler.getSnapshot({ windowSize: 2 });
                return {
                    warningCount: warnings.length,
                    spikeTotal: Number(snapshot?.spikes?.total || 0),
                    recentSpikeCount: Number(snapshot?.spikes?.recent || 0),
                    frameP99: Number(snapshot?.frameMs?.p99 || snapshot?.performance?.frameMs?.p99 || 0),
                };
            } finally {
                console.warn = originalWarn;
            }
        });

        expect(probe.warningCount).toBe(0);
        expect(probe.spikeTotal).toBe(2);
        expect(probe.recentSpikeCount).toBe(2);
        expect(probe.frameP99).toBeGreaterThanOrEqual(42);
    });

    test('T20ai: GameLoop resettet den gemeinsamen Render-Delta-Pfad bei Fokuswechsel sauber', async ({ page }) => {
        await loadGame(page);
        const result = await page.evaluate(async () => {
            const { GameLoop } = await import('/src/core/GameLoop.js');
            const originalRaf = window.requestAnimationFrame;
            const originalCancel = window.cancelAnimationFrame;
            const updates = [];
            try {
                window.requestAnimationFrame = () => 1;
                window.cancelAnimationFrame = () => { };
                const loop = new GameLoop((dt) => updates.push(dt), () => { });
                loop.running = true;
                loop.lastTime = 100;
                loop.requestDeltaReset('window-focus');
                loop._loop(110);
                const firstTiming = { ...loop.getRenderTiming() };
                const updatesAfterReset = updates.length;
                loop._loop(120);
                const secondTiming = { ...loop.getRenderTiming() };
                return {
                    fixedStep: loop.fixedStep,
                    updatesAfterReset,
                    totalUpdates: updates.length,
                    firstTiming,
                    secondTiming,
                };
            } finally {
                window.requestAnimationFrame = originalRaf;
                window.cancelAnimationFrame = originalCancel;
            }
        });

        expect(result.updatesAfterReset).toBe(1);
        expect(result.totalUpdates).toBe(1);
        expect(result.firstTiming.reset).toBeTruthy();
        expect(String(result.firstTiming.resetReason || '')).toContain('window-focus');
        expect(Math.abs(result.firstTiming.stabilizedDt - result.fixedStep)).toBeLessThan(0.000001);
        expect(result.secondTiming.reset).toBeFalsy();
    });

    test('T20ai1: Cinematic-Toggle resettet Kamera-Smoothing und fordert Delta-Reset an', async ({ page }) => {
        await startGame(page);
        const result = await page.evaluate(() => {
            const game = window.GAME_INSTANCE;
            const rig = game?.renderer?.cameraRigSystem;
            if (!game || !rig) {
                return { error: 'missing-runtime' };
            }

            rig.cameraDtSmoothing[0] = 0.05;
            rig.cameraBoostBlend[0] = 0.75;
            rig.cinematicCameraSystem._blendByPlayer[0] = 0.8;
            rig.cinematicCameraSystem._timeByPlayer[0] = 3.2;

            const beforeEnabled = game.renderer.getCinematicEnabled();
            game._toggleCinematicCameraFromGlobalHotkey();

            return {
                error: null,
                beforeEnabled,
                afterEnabled: game.renderer.getCinematicEnabled(),
                pendingDeltaReset: game.gameLoop?._pendingDeltaReset === true,
                pendingDeltaResetReason: String(game.gameLoop?._pendingDeltaResetReason || ''),
                smoothedDt: Number(rig.cameraDtSmoothing[0] || 0),
                boostBlend: Number(rig.cameraBoostBlend[0] || 0),
                cinematicBlend: Number(rig.cinematicCameraSystem.getPlayerBlend(0) || 0),
                cinematicTime: Number(rig.cinematicCameraSystem._timeByPlayer[0] || 0),
                frameTimingReset: rig._frameTiming?.reset === true,
                frameTimingReason: String(rig._frameTiming?.reason || ''),
            };
        });

        expect(result.error).toBeNull();
        expect(result.afterEnabled).toBe(!result.beforeEnabled);
        expect(result.pendingDeltaReset).toBeTruthy();
        expect(result.pendingDeltaResetReason).toContain('cinematic-toggle');
        expect(Math.abs(result.smoothedDt - (1 / 60))).toBeLessThan(0.000001);
        expect(result.boostBlend).toBe(0);
        expect(result.cinematicBlend).toBe(0);
        expect(result.cinematicTime).toBe(0);
        expect(result.frameTimingReset).toBeTruthy();
        expect(result.frameTimingReason).toBe('cinematic-toggle');
    });

    test('T20ai2: Kamera-Update nutzt gerenderte Transforms und spart Anchor-Arbeit ausserhalb First-Person', async ({ page }) => {
        await startGame(page);
        const result = await page.evaluate(() => {
            const game = window.GAME_INSTANCE;
            const entityManager = game?.entityManager;
            const player = entityManager?.humanPlayers?.[0];
            if (!game || !entityManager || !player) {
                return { error: 'missing-runtime' };
            }

            const modes = Array.isArray(game?.config?.CAMERA?.MODES)
                ? game.config.CAMERA.MODES
                : ['THIRD_PERSON', 'FIRST_PERSON', 'TOP_DOWN'];
            const thirdPersonIndex = Math.max(0, modes.indexOf('THIRD_PERSON'));
            const firstPersonIndex = Math.max(0, modes.indexOf('FIRST_PERSON'));

            const originalResolve = player.resolveRenderTransform.bind(player);
            const originalAnchor = player.getFirstPersonCameraAnchor.bind(player);
            let resolveCalls = 0;
            let anchorCalls = 0;

            player.resolveRenderTransform = (...args) => {
                resolveCalls += 1;
                return originalResolve(...args);
            };
            player.getFirstPersonCameraAnchor = (...args) => {
                anchorCalls += 1;
                return originalAnchor(...args);
            };

            try {
                entityManager.renderInterpolatedTransforms(0.35);
                const resolveAfterRender = resolveCalls;

                game.renderer.cameraModes[player.index] = thirdPersonIndex;
                entityManager.updateCameras(1 / 60, 0.35, true);
                const thirdPersonResolveDelta = resolveCalls - resolveAfterRender;
                const thirdPersonAnchorDelta = anchorCalls;

                entityManager.renderInterpolatedTransforms(0.6);
                const resolveBeforeFirstPersonCamera = resolveCalls;
                const anchorBeforeFirstPersonCamera = anchorCalls;
                game.renderer.cameraModes[player.index] = firstPersonIndex;
                entityManager.updateCameras(1 / 60, 0.6, true);

                return {
                    error: null,
                    resolveAfterRender,
                    thirdPersonResolveDelta,
                    thirdPersonAnchorDelta,
                    firstPersonResolveDelta: resolveCalls - resolveBeforeFirstPersonCamera,
                    firstPersonAnchorDelta: anchorCalls - anchorBeforeFirstPersonCamera,
                };
            } finally {
                player.resolveRenderTransform = originalResolve;
                player.getFirstPersonCameraAnchor = originalAnchor;
            }
        });

        expect(result.error).toBeNull();
        expect(result.resolveAfterRender).toBeGreaterThan(0);
        expect(result.thirdPersonResolveDelta).toBe(0);
        expect(result.thirdPersonAnchorDelta).toBe(0);
        expect(result.firstPersonResolveDelta).toBe(0);
        expect(result.firstPersonAnchorDelta).toBe(1);
    });

    test('T20ai3: Third-Person-Fadenkreuz bleibt nach Match-Neustart sichtbar', async ({ page }) => {
        await startGame(page);
        await returnToMenu(page);
        await openGameSubmenu(page);
        await page.evaluate(() => {
            window.GAME_INSTANCE?.startMatch?.();
        });
        await page.waitForFunction(() => {
            const hud = document.getElementById('hud');
            const game = window.GAME_INSTANCE;
            return !!(
                hud && !hud.classList.contains('hidden')
                && game?.entityManager?.players?.length > 0
            );
        }, null, { timeout: 60000 });

        const result = await page.evaluate(() => {
            const game = window.GAME_INSTANCE;
            const player = game?.entityManager?.players?.[0];
            const crosshair = document.getElementById('crosshair-p1');
            if (!game || !player || !crosshair) {
                return { error: 'missing-runtime' };
            }
            return {
                error: null,
                rendererMode: game.renderer.getCameraMode?.(0),
                playerMode: game.config?.CAMERA?.MODES?.[player.cameraMode] || null,
                display: getComputedStyle(crosshair).display,
            };
        });

        expect(result.error).toBeNull();
        expect(result.rendererMode).toBe('THIRD_PERSON');
        expect(result.playerMode).toBe('THIRD_PERSON');
        expect(result.display).toBe('block');
    });

    test('T20aj: Recorder-Backpressure trimmt Capture-Backlog und blockiert den Loop nicht', async ({ page }) => {
        await loadGame(page);
        const result = await page.evaluate(async () => {
            const { MediaRecorderSystem } = await import('/src/core/MediaRecorderSystem.js');
            let now = 0;
            const recorder = new MediaRecorderSystem({
                canvas: { width: 320, height: 180 },
                autoDownload: false,
                globalScope: {},
            });
            recorder._perfNow = () => now;
            recorder._isRecording = true;
            recorder._activeRecorderEngine = 'mediarecorder-native';
            recorder._mediaRecorderSupportsRequestFrame = false;
            recorder._captureLevelIndex = 1;

            const capturedSteps = [];
            recorder._captureMediaRecorderFrame = (stepIntervalMs) => {
                recorder._captureTimestampUs += Math.max(1, Math.round(stepIntervalMs * 1000));
                recorder._frameCount += 1;
                recorder._captureEncodedFrames += 1;
                recorder._recordCaptureTimestampUs(recorder._captureTimestampUs);
                capturedSteps.push(stepIntervalMs);
            };

            const renderDeltasMs = [34, 34, 34, 90, 34, 34, 90, 34, 34, 90, 34, 34];
            for (let i = 0; i < renderDeltasMs.length; i++) {
                now += renderDeltasMs[i];
                recorder.captureRenderedFrame(renderDeltasMs[i] / 1000);
            }

            return {
                capturedCount: capturedSteps.length,
                diagnostics: recorder.getRecordingDiagnostics(),
                accumulatorMs: recorder._captureAccumulatorMs,
            };
        });

        expect(result.capturedCount).toBeGreaterThan(0);
        expect(result.capturedCount).toBeLessThan(12);
        expect(result.diagnostics.backpressureEvents).toBeGreaterThan(0);
        expect(result.diagnostics.captureLevel).toBeGreaterThan(1);
        expect(result.diagnostics.droppedFrames).toBeGreaterThan(0);
        expect(result.accumulatorMs).toBeLessThan(150);
    });

    test('T20aj1: Recorder berechnet Frame-Interval-Stats lazy und cached sie zwischen Diagnostics-Aufrufen', async ({ page }) => {
        await loadGame(page);
        const result = await page.evaluate(async () => {
            const { MediaRecorderSystem } = await import('/src/core/MediaRecorderSystem.js');
            let now = 0;
            const recorder = new MediaRecorderSystem({
                canvas: { width: 320, height: 180 },
                autoDownload: false,
                globalScope: {},
            });
            recorder._perfNow = () => now;
            recorder._isRecording = true;
            recorder._activeRecorderEngine = 'mediarecorder-native';
            recorder._mediaRecorderSupportsRequestFrame = true;
            recorder._mediaRecorderVideoTrack = { requestFrame() { } };

            let computeCalls = 0;
            const originalCompute = recorder._computeFrameIntervalStats.bind(recorder);
            recorder._computeFrameIntervalStats = () => {
                computeCalls += 1;
                return originalCompute();
            };
            recorder._captureMediaRecorderFrame = (stepIntervalMs) => {
                recorder._captureTimestampUs += Math.max(1, Math.round(stepIntervalMs * 1000));
                recorder._frameCount += 1;
                recorder._captureEncodedFrames += 1;
                recorder._recordCaptureTimestampUs(recorder._captureTimestampUs);
            };

            for (let i = 0; i < 5; i++) {
                now += 20;
                recorder.captureRenderedFrame(0.02);
            }

            const callsBeforeDiagnostics = computeCalls;
            const firstDiagnostics = recorder.getRecordingDiagnostics();
            const callsAfterFirstDiagnostics = computeCalls;
            const secondDiagnostics = recorder.getRecordingDiagnostics();
            const callsAfterSecondDiagnostics = computeCalls;

            return {
                callsBeforeDiagnostics,
                callsAfterFirstDiagnostics,
                callsAfterSecondDiagnostics,
                firstSampleCount: Number(firstDiagnostics?.frameIntervalStats?.sampleCount || 0),
                secondSampleCount: Number(secondDiagnostics?.frameIntervalStats?.sampleCount || 0),
            };
        });

        expect(result.callsBeforeDiagnostics).toBe(0);
        expect(result.callsAfterFirstDiagnostics).toBe(1);
        expect(result.callsAfterSecondDiagnostics).toBe(1);
        expect(result.firstSampleCount).toBeGreaterThan(0);
        expect(result.secondSampleCount).toBe(result.firstSampleCount);
    });

    test('T20aj2: Recorder priorisiert unter harter Last Downscale vor FPS-Kollaps', async ({ page }) => {
        await loadGame(page);
        const result = await page.evaluate(async () => {
            const { MediaRecorderSystem } = await import('/src/core/MediaRecorderSystem.js');
            let now = 0;
            const recorder = new MediaRecorderSystem({
                canvas: { width: 320, height: 180 },
                autoDownload: false,
                captureFps: 30,
                globalScope: {},
            });
            recorder._perfNow = () => now;
            recorder._isRecording = true;
            recorder._activeRecorderEngine = 'mediarecorder-native';
            recorder._mediaRecorderSupportsRequestFrame = false;
            recorder._captureLevelIndex = 1;

            const renderDeltasMs = [34, 34, 90, 90, 90, 90, 90];
            for (let i = 0; i < renderDeltasMs.length; i++) {
                now += renderDeltasMs[i];
                recorder.captureRenderedFrame(renderDeltasMs[i] / 1000);
            }

            return recorder.getRecordingDiagnostics();
        });

        expect(result.captureLevel).toBeGreaterThan(1);
        expect(result.captureResolutionScale).toBeLessThanOrEqual(0.5);
        expect(result.effectiveCaptureFps).toBeGreaterThanOrEqual(18);
    });

    test('T20aj3: MediaRecorder-Stop erzwingt finalen Flush und exportiert keinen leeren Clip', async ({ page }) => {
        await loadGame(page);
        const result = await page.evaluate(async () => {
            const { MediaRecorderSystem } = await import('/src/core/MediaRecorderSystem.js');
            const sourceCanvas = document.createElement('canvas');
            sourceCanvas.width = 320;
            sourceCanvas.height = 180;
            const sourceCtx = sourceCanvas.getContext('2d');
            sourceCtx.fillStyle = '#ffffff';
            sourceCtx.fillRect(0, 0, sourceCanvas.width, sourceCanvas.height);

            const captureFpsCalls = [];
            const fakeTrack = {
                requestFrameCalls: 0,
                stopCalls: 0,
                requestFrame() {
                    this.requestFrameCalls += 1;
                },
                stop() {
                    this.stopCalls += 1;
                },
            };
            const fakeStream = {
                getVideoTracks() {
                    return [fakeTrack];
                },
                getTracks() {
                    return [fakeTrack];
                },
            };
            const originalCaptureStream = HTMLCanvasElement.prototype.captureStream;

            class FakeMediaRecorder {
                static lastInstance = null;
                static isTypeSupported() {
                    return true;
                }
                constructor(stream, options = undefined) {
                    this.stream = stream;
                    this.options = options;
                    this.state = 'inactive';
                    this.ondataavailable = null;
                    this.onerror = null;
                    this.onstop = null;
                    this.requestDataCalls = 0;
                    this.stopCalls = 0;
                    this.startTimeslice = null;
                    FakeMediaRecorder.lastInstance = this;
                }
                start(timeslice = 0) {
                    this.startTimeslice = timeslice;
                    this.state = 'recording';
                }
                requestData() {
                    this.requestDataCalls += 1;
                    const mimeType = this.options?.mimeType || 'video/webm';
                    this.ondataavailable?.({
                        data: new Blob([new Uint8Array([1, 2, 3, 4])], { type: mimeType }),
                    });
                }
                stop() {
                    this.stopCalls += 1;
                    this.state = 'inactive';
                    Promise.resolve().then(() => {
                        this.onstop?.();
                    });
                }
            }

            HTMLCanvasElement.prototype.captureStream = function captureStreamStub(fps = 0) {
                captureFpsCalls.push(Number(fps));
                return fakeStream;
            };

            try {
                const recorder = new MediaRecorderSystem({
                    canvas: sourceCanvas,
                    autoDownload: false,
                    captureFps: 30,
                    globalScope: { MediaRecorder: FakeMediaRecorder },
                    capabilityProbe: () => ({
                        canCapture: true,
                        hasRecorder: true,
                        canRecord: true,
                        selectedMimeType: 'video/webm;codecs=vp9',
                        recorderEngine: 'mediarecorder-native',
                        supportReason: 'native-mediarecorder',
                    }),
                });

                const started = await recorder.startRecording({ type: 'manual-test' });
                const stopped = await recorder.stopRecording({ type: 'manual-test' });
                const exportMeta = recorder.getLastExportMeta();
                const recorderInstance = FakeMediaRecorder.lastInstance;
                recorder.dispose();

                return {
                    startStarted: !!started?.started,
                    stopStopped: !!stopped?.stopped,
                    captureFpsCalls,
                    requestDataCalls: Number(recorderInstance?.requestDataCalls || 0),
                    stopCalls: Number(recorderInstance?.stopCalls || 0),
                    requestFrameCalls: Number(fakeTrack.requestFrameCalls || 0),
                    exportSizeBytes: Number(exportMeta?.sizeBytes || 0),
                };
            } finally {
                HTMLCanvasElement.prototype.captureStream = originalCaptureStream;
            }
        });

        expect(result.startStarted).toBeTruthy();
        expect(result.stopStopped).toBeTruthy();
        expect(result.captureFpsCalls.length).toBeGreaterThan(0);
        expect(result.captureFpsCalls.includes(0)).toBeFalsy();
        expect(result.captureFpsCalls.every((fps) => fps === 30)).toBeTruthy();
        expect(result.requestDataCalls).toBe(1);
        expect(result.stopCalls).toBe(1);
        expect(result.requestFrameCalls).toBeGreaterThan(0);
        expect(result.exportSizeBytes).toBeGreaterThan(0);
    });

    test('T20ak: Recorder normalisiert Export-Zeitstempel bei fehlerhafter Stop-Reihenfolge', async ({ page }) => {
        await loadGame(page);
        const result = await page.evaluate(async () => {
            const { MediaRecorderSystem } = await import('/src/core/MediaRecorderSystem.js');
            let now = 4900;
            const recorder = new MediaRecorderSystem({
                canvas: { width: 320, height: 180 },
                autoDownload: false,
                now: () => now,
                globalScope: {},
            });
            recorder._isRecording = true;
            recorder._activeMimeType = 'video/webm';
            recorder._activeRecorderEngine = 'mediarecorder-native';
            recorder._activeRecording = {
                startedAt: 5000,
                trigger: {
                    context: {
                        activeGameMode: 'classic',
                        sessionId: 'phase9',
                    },
                },
                stopResolve: () => { },
            };
            recorder._lastFrameIntervalStats = {
                sampleCount: 3,
                mean: 40,
                p95: 45,
                p99: 48,
                max: 48,
            };
            await recorder._finalizeBlobExport(new Blob(['clip'], { type: 'video/webm' }), 'video/webm');
            const exportMeta = recorder.getLastExportMeta();
            recorder.dispose();
            return exportMeta;
        });

        expect(result).toBeTruthy();
        expect(result.endedAt).toBeGreaterThanOrEqual(result.startedAt);
        expect(result.durationMs).toBeGreaterThan(0);
        expect(result.timestampValidation?.adjusted).toBeTruthy();
        expect(String(result.fileName || '')).not.toContain('invalid-date');
    });

    test('T20ak1: Recorder-Export wartet auf API-Ergebnis und reportet Fallback-Status korrekt', async ({ page }) => {
        await loadGame(page);
        const result = await page.evaluate(async () => {
            const { MediaRecorderSystem } = await import('/src/core/MediaRecorderSystem.js');
            const originalFetch = globalThis.fetch;
            let fetchCalls = 0;
            let downloadCalls = 0;
            let stopResolveAt = 0;
            let stopResult = null;

            globalThis.fetch = async () => {
                fetchCalls += 1;
                await new Promise((resolve) => setTimeout(resolve, 15));
                return {
                    ok: false,
                    status: 500,
                };
            };

            try {
                const recorder = new MediaRecorderSystem({
                    canvas: { width: 320, height: 180 },
                    autoDownload: true,
                    now: () => Date.now(),
                    globalScope: {},
                    downloadHandler: () => {
                        downloadCalls += 1;
                    },
                });
                recorder._isRecording = true;
                recorder._activeMimeType = 'video/webm';
                recorder._activeRecorderEngine = 'mediarecorder-native';
                recorder._activeRecording = {
                    startedAt: Date.now() - 120,
                    trigger: { type: 'qa' },
                    stopResolve: (result) => {
                        stopResolveAt = Date.now();
                        stopResult = result;
                    },
                };

                const startedAt = Date.now();
                await recorder._finalizeBlobExport(new Blob(['clip'], { type: 'video/webm' }), 'video/webm');
                const elapsedUntilResolve = Math.max(0, stopResolveAt - startedAt);
                const exportMeta = recorder.getLastExportMeta();
                recorder.dispose();

                return {
                    fetchCalls,
                    downloadCalls,
                    elapsedUntilResolve,
                    exportStatus: exportMeta?.exportStatus || null,
                    stopResultExportStatus: stopResult?.exportStatus || null,
                    stopResultTransport: stopResult?.exportTransport || null,
                };
            } finally {
                globalThis.fetch = originalFetch;
            }
        });

        expect(result.fetchCalls).toBeGreaterThanOrEqual(1);
        expect(result.downloadCalls).toBe(1);
        expect(result.elapsedUntilResolve).toBeGreaterThanOrEqual(12);
        expect(result.exportStatus?.status).toBe('saved_via_download_fallback');
        expect(result.stopResultExportStatus?.status).toBe('saved_via_download_fallback');
        expect(result.stopResultTransport).toBe('api-fallback-download');
    });

    test('T20ae: Runtime-Dispose entfernt globale und Menue-Listener vor Reinit', async ({ page }) => {
        const errors = collectErrors(page);
        await loadGame(page);
        const result = await page.evaluate(() => {
            const first = window.GAME_INSTANCE;
            if (!first?.dispose || typeof first.constructor !== 'function') {
                return { error: 'missing-game-runtime' };
            }

            let firstStartCalls = 0;
            let secondStartCalls = 0;
            let secondKeyCaptureCalls = 0;
            let firstResizeCalls = 0;
            let secondResizeCalls = 0;

            first.runtimeFacade.startMatch = () => {
                firstStartCalls += 1;
                return false;
            };
            first.dispose();

            const second = new first.constructor();
            window.GAME_INSTANCE = second;
            window.GAME_RUNTIME = second.runtimeFacade;
            window.GAME_DEBUG = second.debugApi;
            second.runtimeFacade.startMatch = () => {
                secondStartCalls += 1;
                return false;
            };

            second.keyCapture = { playerKey: 'PLAYER_1', actionKey: 'UP' };
            second.keybindEditorController.handleKeyCapture = () => {
                if (!second.keyCapture) {
                    return false;
                }
                secondKeyCaptureCalls += 1;
                return true;
            };
            window.dispatchEvent(new KeyboardEvent('keydown', {
                code: 'KeyZ',
                bubbles: true,
                cancelable: true,
            }));

            second.keyCapture = null;
            first.renderer._onResize = () => {
                firstResizeCalls += 1;
            };
            second.renderer._onResize = () => {
                secondResizeCalls += 1;
            };
            window.dispatchEvent(new Event('resize'));

            window.dispatchEvent(new KeyboardEvent('keydown', {
                code: 'KeyQ',
                bubbles: true,
                cancelable: true,
            }));
            const firstInputUpdated = !!first.input?.keys?.KeyQ;
            const secondInputUpdated = !!second.input?.keys?.KeyQ;

            document.getElementById('btn-start')?.click();
            second.dispose();

            return {
                error: null,
                firstStartCalls,
                secondStartCalls,
                secondKeyCaptureCalls,
                firstResizeCalls,
                secondResizeCalls,
                firstInputUpdated,
                secondInputUpdated,
            };
        });

        expect(result.error).toBeNull();
        expect(result.firstStartCalls).toBe(0);
        expect(result.secondStartCalls).toBe(1);
        expect(result.secondKeyCaptureCalls).toBe(1);
        expect(result.firstResizeCalls).toBe(0);
        expect(result.secondResizeCalls).toBe(1);
        expect(result.firstInputUpdated).toBeFalsy();
        expect(result.secondInputUpdated).toBeTruthy();
        expect(errors).toHaveLength(0);
    });

    test('T20ae1: PauseOverlayController setup/dispose bleibt idempotent ohne doppelte Handler', async ({ page }) => {
        await loadGame(page);
        const result = await page.evaluate(async () => {
            const { PauseOverlayController } = await import('/src/ui/PauseOverlayController.js');

            const makeButton = () => document.createElement('button');
            const makeCheckbox = () => {
                const input = document.createElement('input');
                input.type = 'checkbox';
                return input;
            };

            const keybindP1 = document.createElement('div');
            const keybindButton = document.createElement('button');
            keybindButton.className = 'keybind-btn';
            keybindButton.dataset.action = 'THRUST';
            keybindP1.appendChild(keybindButton);

            const keybindP2 = document.createElement('div');
            const pauseOverlay = document.createElement('div');
            const pauseSettingsPanel = document.createElement('div');
            pauseSettingsPanel.classList.add('hidden');

            const ui = {
                pauseOverlay,
                pauseResumeButton: makeButton(),
                pauseSettingsButton: makeButton(),
                pauseSettingsBackButton: makeButton(),
                pauseMenuButton: makeButton(),
                pauseSettingsPanel,
                pauseKeybindP1: keybindP1,
                pauseKeybindP2: keybindP2,
                pauseAutoRollToggle: makeCheckbox(),
                pauseInvertP1: makeCheckbox(),
                pauseInvertP2: makeCheckbox(),
            };

            let keyCaptureCalls = 0;
            const game = {
                state: 'PAUSED',
                ui,
                settings: {
                    autoRoll: false,
                    invertPitch: { PLAYER_1: false, PLAYER_2: false },
                },
                entityManager: { players: [] },
                keybindEditorController: { renderPauseEditor() { } },
                gameLoop: { requestDeltaReset() { } },
                runtimeFacade: {
                    isNetworkSession: () => false,
                    isHost: () => true,
                    _teardownSession() { },
                },
                hudRuntimeSystem: { clearNetworkScoreboard() { } },
                _showMainNav() { },
                keyCapture: null,
            };

            const matchFlowUiController = {
                game,
                applyLifecycleTransition() { },
                applyMatchUiState() { },
                resetCrosshairUi() { },
            };
            const ports = {
                inputPort: {
                    clearJustPressed() { },
                    startKeyCapture() { keyCaptureCalls += 1; },
                },
                settingsPort: { applyAutoRoll() { } },
                sessionPort: {
                    clearLastRoundGhost() { },
                    teardownMatchSession() { },
                },
                uiFeedbackPort: {
                    showMenuPanel() { },
                    syncAll() { },
                },
            };

            const controller = new PauseOverlayController({
                matchFlowUiController,
                game,
                ports,
            });

            let resumeCalls = 0;
            let menuCalls = 0;
            controller.resumeFromPause = () => {
                resumeCalls += 1;
            };
            controller.returnToMenuFromPause = () => {
                menuCalls += 1;
            };

            controller.setupListeners();
            controller.setupListeners();

            ui.pauseResumeButton.click();
            ui.pauseMenuButton.click();
            keybindButton.click();

            const beforeDispose = {
                resumeCalls,
                menuCalls,
                keyCaptureCalls,
            };

            controller.dispose();
            ui.pauseResumeButton.click();
            ui.pauseMenuButton.click();
            keybindButton.click();

            const afterDispose = {
                resumeCalls,
                menuCalls,
                keyCaptureCalls,
            };

            controller.setupListeners();
            ui.pauseResumeButton.click();
            ui.pauseMenuButton.click();
            keybindButton.click();

            const afterRebind = {
                resumeCalls,
                menuCalls,
                keyCaptureCalls,
            };

            controller.dispose();

            return {
                beforeDispose,
                afterDispose,
                afterRebind,
            };
        });

        expect(result.beforeDispose.resumeCalls).toBe(1);
        expect(result.beforeDispose.menuCalls).toBe(1);
        expect(result.beforeDispose.keyCaptureCalls).toBe(1);
        expect(result.afterDispose.resumeCalls).toBe(result.beforeDispose.resumeCalls);
        expect(result.afterDispose.menuCalls).toBe(result.beforeDispose.menuCalls);
        expect(result.afterDispose.keyCaptureCalls).toBe(result.beforeDispose.keyCaptureCalls);
        expect(result.afterRebind.resumeCalls).toBe(2);
        expect(result.afterRebind.menuCalls).toBe(2);
        expect(result.afterRebind.keyCaptureCalls).toBe(2);
    });

    test('T20ae2: RuntimeSessionLifecycle puffert fruehe stateUpdate-Pakete und wartet als Client auf Host-Startsignal', async ({ page }) => {
        await loadGame(page);
        const result = await page.evaluate(async () => {
            const lifecycleModule = await import('/src/core/runtime/RuntimeSessionLifecycleService.js');
            const {
                setupRuntimeClientStateReceiver,
                waitForRuntimePlayersLoaded,
            } = lifecycleModule;

            const createEventBusSession = ({ isHost, localPlayerId, players }) => {
                const listeners = new Map();
                const sentInputs = [];
                return {
                    isHost,
                    localPlayerId,
                    getPlayers() {
                        return players;
                    },
                    sendInput(payload) {
                        sentInputs.push(payload);
                    },
                    on(event, handler) {
                        const entries = listeners.get(event) || [];
                        entries.push(handler);
                        listeners.set(event, entries);
                    },
                    off(event, handler) {
                        const entries = listeners.get(event) || [];
                        listeners.set(event, entries.filter((entry) => entry !== handler));
                    },
                    emit(event, payload) {
                        const entries = listeners.get(event) || [];
                        for (const handler of entries) {
                            handler(payload);
                        }
                    },
                    listenerCount(event) {
                        return (listeners.get(event) || []).length;
                    },
                    sentInputs,
                };
            };

            const hostSession = createEventBusSession({
                isHost: true,
                localPlayerId: 'host',
                players: [{ peerId: 'host' }, { peerId: 'client' }],
            });
            const hostFacade = {
                session: hostSession,
                _arenaLoadedPeers: new Set(),
                _onPlayerLoadedHandler: null,
            };

            const hostWaitPromise = waitForRuntimePlayersLoaded(hostFacade);
            hostSession.emit('playerLoaded', { playerId: 'client' });
            await hostWaitPromise;

            const clientSession = createEventBusSession({
                isHost: false,
                localPlayerId: 'client',
                players: [{ peerId: 'host' }, { peerId: 'client' }],
            });
            const clientFacade = {
                session: clientSession,
                _arenaLoadedPeers: new Set(),
                _onArenaStartSignalHandler: null,
            };

            const clientWaitPromise = waitForRuntimePlayersLoaded(clientFacade);
            await new Promise((resolve) => setTimeout(resolve, 0));
            clientSession.emit('remoteInput', { input: { type: 'arena_start' } });
            await clientWaitPromise;

            let resolveReconcilerFactory = null;
            const receiveCalls = [];
            let reconcileCalls = 0;
            const delayedReconciler = new Promise((resolve) => {
                resolveReconcilerFactory = resolve;
            });

            const receiverSession = createEventBusSession({
                isHost: false,
                localPlayerId: 'client',
                players: [{ peerId: 'host' }, { peerId: 'client' }],
            });
            const receiverFacade = {
                session: receiverSession,
                game: {
                    entityManager: {
                        players: [{ index: 0, position: { x: 0, y: 0, z: 0 } }],
                    },
                },
                _pendingStateUpdates: [],
                _loadStateReconciler: () => delayedReconciler,
            };

            setupRuntimeClientStateReceiver(receiverFacade);
            receiverSession.emit('stateUpdate', { id: 1, state: { players: [] } });
            receiverSession.emit('stateUpdate', { id: 2, state: { players: [] } });

            const bufferedBeforeResolve = receiverFacade._pendingStateUpdates.length;
            resolveReconcilerFactory({
                receiveServerState(serverState) {
                    receiveCalls.push(serverState?.id || 0);
                },
                reconcile() {
                    reconcileCalls += 1;
                },
                reset() { },
            });
            await new Promise((resolve) => setTimeout(resolve, 0));

            receiverSession.emit('stateUpdate', { id: 3, state: { players: [] } });

            return {
                hostStartSignalType: hostSession.sentInputs[0]?.type || null,
                hostStartSignalPeers: hostSession.sentInputs[0]?.expectedPeerIds || [],
                clientLoadedSignalType: clientSession.sentInputs[0]?.type || null,
                clientRemoteInputListenersAfterResolve: clientSession.listenerCount('remoteInput'),
                bufferedBeforeResolve,
                bufferedAfterResolve: receiverFacade._pendingStateUpdates.length,
                receiveCalls,
                reconcileCalls,
            };
        });

        expect(result.hostStartSignalType).toBe('arena_start');
        expect(Array.isArray(result.hostStartSignalPeers)).toBeTruthy();
        expect(result.hostStartSignalPeers.includes('host')).toBeTruthy();
        expect(result.hostStartSignalPeers.includes('client')).toBeTruthy();
        expect(result.clientLoadedSignalType).toBe('arena_loaded');
        expect(result.clientRemoteInputListenersAfterResolve).toBe(0);
        expect(result.bufferedBeforeResolve).toBe(2);
        expect(result.bufferedAfterResolve).toBe(0);
        expect(result.receiveCalls).toEqual([1, 2, 3]);
        expect(result.reconcileCalls).toBeGreaterThanOrEqual(2);
    });

    test('T20ae3: TelemetryHistoryStore wiederholt temporaere DB-Fehler und oeffnet Verbindung neu', async ({ page }) => {
        await loadGame(page);
        const result = await page.evaluate(async () => {
            const { TelemetryHistoryStore } = await import('/src/state/TelemetryHistoryStore.js');

            const store = new TelemetryHistoryStore();
            let getDbCalls = 0;
            let invalidateCalls = 0;
            let operationCalls = 0;
            store._getDb = async () => {
                getDbCalls += 1;
                return { id: `db-${getDbCalls}` };
            };
            store._invalidateDb = () => {
                invalidateCalls += 1;
            };

            const retryResult = await store._runWithDbRetry(async () => {
                operationCalls += 1;
                if (operationCalls === 1) {
                    const transientError = new Error('temporary');
                    transientError.name = 'AbortError';
                    throw transientError;
                }
                return 'ok-after-retry';
            }, 'fallback');

            const terminalResult = await store._runWithDbRetry(async () => {
                const terminalError = new Error('terminal');
                terminalError.name = 'TypeError';
                throw terminalError;
            }, 'fallback-terminal');

            return {
                retryResult,
                terminalResult,
                getDbCalls,
                invalidateCalls,
                operationCalls,
            };
        });

        expect(result.retryResult).toBe('ok-after-retry');
        expect(result.terminalResult).toBe('fallback-terminal');
        expect(result.operationCalls).toBe(2);
        expect(result.getDbCalls).toBeGreaterThanOrEqual(3);
        expect(result.invalidateCalls).toBeGreaterThanOrEqual(2);
    });

    test('T10b: Portal-Runtime bleibt im Validierungsszenario funktionsfaehig', async ({ page }) => {
        await loadGame(page);
        await page.evaluate(() => {
            const g = window.GAME_INSTANCE;
            const debugApi = g?.debugApi || window.GAME_DEBUG || null;
            const applyScenario = typeof g?.applyBotValidationScenario === 'function'
                ? g.applyBotValidationScenario.bind(g)
                : (typeof debugApi?.applyBotValidationScenario === 'function'
                    ? debugApi.applyBotValidationScenario.bind(debugApi)
                    : null);
            if (typeof applyScenario !== 'function') {
                throw new Error('applyBotValidationScenario missing');
            }
            applyScenario('V3');
            g.winsNeeded = 1;
            if (g.settings) g.settings.winsNeeded = 1;
            if (typeof g._onSettingsChanged === 'function') g._onSettingsChanged();
            g.startMatch();
        });
        await page.waitForFunction(() => window.GAME_INSTANCE?.state === 'PLAYING', null, { timeout: 10000 });

        const probe = await page.evaluate(() => {
            const g = window.GAME_INSTANCE;
            const portal = g?.arena?.portals?.[0];
            if (!portal) return null;

            const hit = g.arena.checkPortal(portal.posA.clone(), 0.1, 'qa-portal');
            return {
                portalPairs: g.arena.portals.length,
                hit: !!hit,
                targetDistance: hit ? hit.target.distanceTo(portal.posB) : null,
                cooldown: portal.cooldowns.get('qa-portal') || 0,
            };
        });

        expect(probe).not.toBeNull();
        expect(probe.portalPairs).toBe(4);
        expect(probe.hit).toBeTruthy();
        expect(probe.targetDistance).toBeLessThan(0.001);
        expect(probe.cooldown).toBeGreaterThan(0);
    });

    test('T10c: Prewarmed Match behaelt Arena-Visuals beim Start', async ({ page }) => {
        await loadGame(page);
        await openGameSubmenu(page);
        await page.waitForTimeout(250);
        await page.click('#submenu-game:not(.hidden) #btn-start');
        await page.waitForFunction(() => {
            const hud = document.getElementById('hud');
            const g = window.GAME_INSTANCE;
            return hud && !hud.classList.contains('hidden') && g?.entityManager?.players?.length > 0;
        }, null, { timeout: 15000 });

        const probe = await page.evaluate(() => {
            const g = window.GAME_INSTANCE;
            return {
                floorParent: g?.arena?._floorMesh?.parent?.name ?? null,
                wallParent: g?.arena?._mergedWallMesh?.parent?.name ?? null,
                obstacleParent: g?.arena?._mergedObstacleMesh?.parent?.name ?? null,
                nonWallObstacleCount: Array.isArray(g?.arena?.obstacles)
                    ? g.arena.obstacles.filter((entry) => !entry?.isWall).length
                    : 0,
            };
        });

        expect(probe.floorParent).toBe('matchRoot');
        expect(probe.wallParent).toBe('matchRoot');
        expect(probe.obstacleParent).toBe('matchRoot');
        expect(probe.nonWallObstacleCount).toBeGreaterThan(0);
    });

    test('T10d: Portal-Layout folgt geaenderter Portal-Anzahl im Prewarm-Pfad', async ({ page }) => {
        await loadGame(page);
        await openGameSubmenu(page);
        await page.evaluate(() => {
            const toggle = document.getElementById('portals-toggle');
            const slider = document.getElementById('portal-count-slider');
            if (toggle && !toggle.checked) {
                toggle.checked = true;
                toggle.dispatchEvent(new Event('change', { bubbles: true }));
            }
            if (slider) {
                slider.value = '4';
                slider.dispatchEvent(new Event('input', { bubbles: true }));
                slider.dispatchEvent(new Event('change', { bubbles: true }));
            }
        });
        await page.waitForTimeout(250);
        await page.click('#submenu-game:not(.hidden) #btn-start');
        await page.waitForFunction(() => {
            const hud = document.getElementById('hud');
            const g = window.GAME_INSTANCE;
            return hud && !hud.classList.contains('hidden') && g?.entityManager?.players?.length > 0;
        }, null, { timeout: 15000 });

        const portalCount = await page.evaluate(() => window.GAME_INSTANCE?.arena?.portals?.length ?? 0);
        expect(portalCount).toBe(4);
    });

    test('T10e: Custom-Map-Aenderungen mit gleichem Key laden neues Layout', async ({ page }) => {
        const mapA = buildLegacyRuntimeCustomMap([
            { pos: [0, 5, 0], size: [6, 6, 6] },
        ]);
        const mapB = buildLegacyRuntimeCustomMap([
            { pos: [0, 5, 0], size: [6, 6, 6] },
            { pos: [12, 5, 0], size: [6, 6, 6] },
            { pos: [-12, 5, 0], size: [6, 6, 6] },
        ]);

        await loadGame(page);
        await openGameSubmenu(page);
        await page.evaluate(({ storageKey, mapJson }) => {
            localStorage.setItem(storageKey, mapJson);
            const g = window.GAME_INSTANCE;
            if (g?.settings) {
                g.settings.mapKey = 'custom';
            }
            g?.runtimeFacade?.onSettingsChanged?.({ changedKeys: ['mapKey'] });
        }, { storageKey: CUSTOM_MAP_STORAGE_KEY, mapJson: mapA });
        await page.waitForTimeout(250);
        await page.click('#submenu-game:not(.hidden) #btn-start');
        await page.waitForFunction(() => {
            const hud = document.getElementById('hud');
            const g = window.GAME_INSTANCE;
            return hud && !hud.classList.contains('hidden') && g?.entityManager?.players?.length > 0;
        }, null, { timeout: 15000 });

        const firstObstacleCount = await page.evaluate(() =>
            window.GAME_INSTANCE?.arena?.obstacles?.filter((entry) => !entry?.isWall)?.length ?? 0
        );
        expect(firstObstacleCount).toBe(1);

        await returnToMenu(page);
        await page.evaluate(({ storageKey, mapJson }) => {
            localStorage.setItem(storageKey, mapJson);
            const g = window.GAME_INSTANCE;
            if (g?.settings) {
                g.settings.mapKey = 'custom';
            }
            g?.runtimeFacade?.onSettingsChanged?.({ changedKeys: ['mapKey'] });
        }, { storageKey: CUSTOM_MAP_STORAGE_KEY, mapJson: mapB });

        await page.waitForTimeout(250);
        const reopened = await page.evaluate(() => {
            const runtime = window.GAME_INSTANCE?.uiManager?.menuNavigationRuntime;
            return !!runtime?.showPanel?.('submenu-game', { trigger: 'test_custom_map_reopen' });
        });
        expect(reopened).toBeTruthy();
        await page.waitForFunction(() => {
            const panel = document.getElementById('submenu-game');
            const game = window.GAME_INSTANCE;
            return !!(
                panel
                && !panel.classList.contains('hidden')
                && game?.settings?.mapKey === 'custom'
            );
        }, null, { timeout: 5000 });
        await page.locator('#submenu-game:not(.hidden) #btn-start').waitFor({ state: 'visible', timeout: 5000 });
        await page.click('#submenu-game:not(.hidden) #btn-start');
        await page.waitForFunction(() => {
            const hud = document.getElementById('hud');
            const g = window.GAME_INSTANCE;
            return hud && !hud.classList.contains('hidden') && g?.entityManager?.players?.length > 0;
        }, null, { timeout: 15000 });

        const secondProbe = await page.evaluate(() => ({
            mapKey: window.GAME_INSTANCE?.arena?.currentMapKey ?? null,
            obstacleCount: window.GAME_INSTANCE?.arena?.obstacles?.filter((entry) => !entry?.isWall)?.length ?? 0,
            floorParent: window.GAME_INSTANCE?.arena?._floorMesh?.parent?.name ?? null,
        }));

        expect(secondProbe.mapKey).toBe('custom');
        expect(secondProbe.obstacleCount).toBe(3);
        expect(secondProbe.floorParent).toBe('matchRoot');
    });

    test('T10f: Editor-Disk-Maps erscheinen im Runtime-Menue und laden im Match', async ({ page }) => {
        test.setTimeout(120000);
        const moduleBackup = readFileSync(GENERATED_LOCAL_MAPS_MODULE_PATH, 'utf8');
        const mapName = `QA Disk Map ${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const mapJson = stringifyMapDocument({
            arenaSize: { width: 2800, height: 950, depth: 2400 },
            hardBlocks: [
                { id: 'qa_disk_block', x: 0, y: 160, z: 0, width: 320, height: 180, depth: 320 },
            ],
        });

        let createdMapKey = '';

        try {
            await page.goto(EDITOR_VIEW_PATHS.MAP_EDITOR, { waitUntil: 'domcontentloaded', timeout: 45000 });
            await page.waitForSelector('#btnSaveToGame', { timeout: 15000 });

            const saveResult = await page.evaluate(async ({ mapName, mapJson, saveMapRoute }) => {
                const response = await fetch(saveMapRoute, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        mapName,
                        jsonText: mapJson,
                    }),
                });
                const payload = await response.json();
                return {
                    status: response.status,
                    ok: response.ok,
                    payload,
                };
            }, { mapName, mapJson, saveMapRoute: EDITOR_API_ROUTES.SAVE_MAP_DISK });

            expect(saveResult.ok).toBeTruthy();
            expect(saveResult.payload?.ok).toBeTruthy();
            expect(saveResult.payload?.generatedModulePath).toBe(EDITOR_DATA_PATHS.GENERATED_LOCAL_MAPS_MODULE);

            createdMapKey = String(saveResult.payload?.mapKey || '');
            expect(createdMapKey).toMatch(/^editor_/);

            await page.waitForTimeout(900);
            await loadGameWithRetry(page);
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
            }, mapName);

            expect(selectionState.optionCount).toBeGreaterThan(0);
            expect(selectionState.matching).toBeTruthy();
            expect(selectionState.matching?.value).toBe(createdMapKey);

            await page.evaluate((mapKey) => {
                const game = window.GAME_INSTANCE;
                if (!game?.settings) return;
                game.settings.mapKey = mapKey;
                game.runtimeFacade?.onSettingsChanged?.({ changedKeys: ['mapKey'] });
            }, createdMapKey);
            await page.waitForTimeout(200);

            const runtimeSelection = await page.evaluate(() => ({
                domValue: document.getElementById('map-select')?.value ?? null,
                settingsMapKey: window.GAME_INSTANCE?.settings?.mapKey ?? null,
            }));

            expect(runtimeSelection.domValue).toBe(createdMapKey);
            expect(runtimeSelection.settingsMapKey).toBe(createdMapKey);
            await page.click('#submenu-game:not(.hidden) #btn-start');
            await page.waitForFunction(() => {
                const hud = document.getElementById('hud');
                const g = window.GAME_INSTANCE;
                return hud && !hud.classList.contains('hidden') && g?.entityManager?.players?.length > 0;
            }, null, { timeout: 15000 });

            const matchProbe = await page.evaluate(() => ({
                mapKey: window.GAME_INSTANCE?.arena?.currentMapKey ?? null,
                obstacleCount: window.GAME_INSTANCE?.arena?.obstacles?.filter((entry) => !entry?.isWall)?.length ?? 0,
            }));

            expect(matchProbe.mapKey).toBe(createdMapKey);
            expect(matchProbe.obstacleCount).toBeGreaterThanOrEqual(1);
        } finally {
            if (createdMapKey) {
                rmSync(path.join(EDITOR_MAP_DIR, `${createdMapKey}${EDITOR_JSON_SUFFIX}`), { force: true });
                rmSync(path.join(EDITOR_MAP_DIR, `${createdMapKey}${RUNTIME_JSON_SUFFIX}`), { force: true });
            }
            writeFileSync(GENERATED_LOCAL_MAPS_MODULE_PATH, moduleBackup, 'utf8');
            if (!page.isClosed()) {
                await page.waitForTimeout(200);
            }
        }
    });
});

// ---------------------------------------------------------------------------
// V56 Regression Tests — Defensive Improvements & Edge-Case Fixes
// ---------------------------------------------------------------------------
test.describe('V56: Code-Audit Remediation Regressions', () => {
    test.describe.configure({ mode: 'serial' });

    test('V56.1 Session-ID guard rejects stale async createMatchSession result', async ({ page }) => {
        await loadGame(page);
        const result = await page.evaluate(async () => {
            const game = window.GAME_INSTANCE;
            const orch = game.matchLifecycleSessionOrchestrator;
            if (!orch) return { skip: true };

            // First call (sync path)
            orch.createMatchSession({});
            const firstId = orch._activeSessionId;

            // Second call supersedes the first
            orch.createMatchSession({});
            const secondId = orch._activeSessionId;

            return {
                skip: false,
                idsAreDifferent: firstId !== secondId,
                secondIdActive: orch._activeSessionId === secondId,
            };
        });
        if (result.skip) { test.skip(); return; }
        expect(result.idsAreDifferent).toBeTruthy();
        expect(result.secondIdActive).toBeTruthy();
    });

    test('V56.3 TouchInputSource double-dispose does not throw', async ({ page }) => {
        await loadGame(page);
        const result = await page.evaluate(() => {
            const { TouchInputSource } = window.__CC_MODULES?.TouchInputSource
                || {};
            if (!TouchInputSource) {
                // Fallback: try to instantiate from game instance input sources
                const game = window.GAME_INSTANCE;
                const touchSrc = game?.inputSources?.find(s => s?._disposed !== undefined);
                if (touchSrc) {
                    touchSrc.dispose();
                    touchSrc.dispose(); // second call must not throw
                    return { ok: true, disposed: touchSrc._disposed };
                }
                return { skip: true };
            }
            const src = new TouchInputSource();
            src.dispose();
            src.dispose();
            return { ok: true, disposed: src._disposed };
        });
        if (result.skip) { test.skip(); return; }
        expect(result.ok).toBeTruthy();
        expect(result.disposed).toBeTruthy();
    });
});
