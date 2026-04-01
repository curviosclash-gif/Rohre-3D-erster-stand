import { test, expect } from '@playwright/test';
import { CONFIG } from '../src/core/Config.js';
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
import { createMapDocument, parseMapJSON, stringifyMapDocument, toArenaMapDefinition } from '../src/entities/MapSchema.js';
import { generateJSONExport, importFromJSON } from '../editor/js/EditorMapSerializer.js';
import { RoundMetricsStore } from '../src/state/recorder/RoundMetricsStore.js';
import {
    getVehicleManagerInteractionRules,
    listVehicleManagerCatalogEntries,
    resolveVehicleManagerCatalogEntry,
} from '../src/ui/arcade/VehicleManagerCatalog.js';
import { applyPlayerPowerup, updatePlayerEffects } from '../src/entities/player/PlayerEffectOps.js';

const SETTINGS_STORAGE_KEY = 'cuviosclash.settings.v1';
const SETTINGS_PROFILES_STORAGE_KEY = 'cuviosclash.settings-profiles.v1';
const LEGACY_SETTINGS_STORAGE_KEY = 'aero-arena-3d.settings.v1';
const MENU_DRAFTS_STORAGE_KEY = 'cuviosclash.menu-drafts.v1';
const MENU_PRESETS_STORAGE_KEY = 'cuviosclash.menu-presets.v1';
const CUSTOM_MAP_STORAGE_KEY = 'custom_map_test';
const ARCADE_VEHICLE_PROFILE_STORAGE_KEY = 'cuviosclash.arcade-vehicle-profile.v1';
const ARCADE_VEHICLE_LOADOUT_STORAGE_KEY = 'cuviosclash.arcade-vehicle-loadouts.v1';
const ARCADE_LAST_RUN_STORAGE_KEY = 'cuviosclash.arcade.last_run.v1';

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

test.describe('T66x: Vehicle-Manager-Katalogvertrag', () => {
    test('T66x1: Katalog liefert Pflichtmetadaten fuer jedes Vehicle', () => {
        const entries = listVehicleManagerCatalogEntries();
        expect(entries.length).toBeGreaterThan(0);

        for (let i = 0; i < entries.length; i += 1) {
            const entry = entries[i];
            expect(typeof entry.vehicleId).toBe('string');
            expect(entry.vehicleId.length).toBeGreaterThan(0);
            expect(typeof entry.label).toBe('string');
            expect(entry.label.length).toBeGreaterThan(0);
            expect(['jaeger', 'kreuzer', 'spezial', 'custom']).toContain(entry.kategorie);
            expect(['kompakt', 'standard', 'schwer']).toContain(entry.hitboxKlasse);
            expect(typeof entry.kurzbeschreibung).toBe('string');
            expect(entry.kurzbeschreibung.length).toBeGreaterThan(0);
            expect(Number.isInteger(entry.sortOrder)).toBeTruthy();
            expect(Array.isArray(entry.keywords)).toBeTruthy();
            expect(entry.keywords.length).toBeGreaterThan(0);
            expect(typeof entry.previewToken).toBe('string');
            expect(entry.previewToken.length).toBeGreaterThan(0);
            expect(typeof entry.statsSummary).toBe('object');
            expect(entry.statsSummary).not.toBeNull();
            expect(typeof entry.statsSummary.armor).toBe('number');
            expect(typeof entry.statsSummary.agility).toBe('number');
            expect(typeof entry.statsSummary.control).toBe('number');
            expect(typeof entry.statsSummary.upgradePotential).toBe('number');
        }
    });

    test('T66x2: Interaktionsregeln definieren Kategorien, Filter und Breakpoints', () => {
        const rules = getVehicleManagerInteractionRules();
        expect(rules.version).toBe('66.1');
        expect(Array.isArray(rules.categories)).toBeTruthy();
        expect(rules.categories.map((entry) => entry.id)).toEqual(['all', 'jaeger', 'kreuzer', 'spezial', 'custom']);
        expect(rules.filterChips.category).toContain('jaeger');
        expect(rules.filterChips.hitboxKlasse).toContain('kompakt');
        expect(rules.preview.mode).toBe('interactive-3d');
        expect(rules.preview.allowOrbit).toBeTruthy();
        expect(rules.upgradeFlow.maxTier).toBe('T3');
        expect(rules.responsiveBreakpoints.stackedPanelMaxWidth).toBe(1000);
        expect(rules.responsiveBreakpoints.compactListMaxWidth).toBe(700);
    });

    test('T66x3: Unbekannte Vehicle-IDs liefern stabilen Katalog-Fallback', () => {
        const fallback = resolveVehicleManagerCatalogEntry('ghost_vehicle');
        expect(fallback.vehicleId).toBe('ghost_vehicle');
        expect(fallback.label).toBe('ghost_vehicle');
        expect(fallback.kategorie).toBe('custom');
        expect(fallback.hitboxKlasse).toBe('standard');
        expect(fallback.previewToken).toBe('vehicle:placeholder');
        expect(fallback.statsSummary.upgradePotential).toBeGreaterThan(0);
    });
});

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
        expect(roundtrip.portalMode).toBe('authored');
        expect(roundtrip.itemSpawnMode).toBe('anchor-only');
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

    test('T14ea: Editor-Import/Export normalisiert Legacy-Rocket-PickupType auf aktive Tier-Namen', async () => {
        const manager = createMockEditorManager();
        const sourceDocument = {
            arenaSize: { width: 280, height: 110, depth: 280 },
            items: [
                {
                    id: 'legacy_rocket_anchor',
                    type: 'item_rocket',
                    model: 'item_rocket',
                    pickupType: 'ROCKET_STRONG',
                    weight: 1.1,
                    x: 24,
                    y: 16,
                    z: -18,
                },
            ],
        };

        importFromJSON(manager, JSON.stringify(sourceDocument));
        const exported = generateJSONExport(manager, sourceDocument.arenaSize);
        const roundtrip = parseMapJSON(exported).map;
        const pickupType = String(roundtrip?.items?.[0]?.pickupType || '');

        expect(pickupType).toBe('ROCKET_HEAVY');
    });

    test('T14eb: Runtime-Warnungen machen Portalmodus, Spawnmodus und Legacy-Gates sichtbar', async () => {
        const sourceDocument = {
            arenaSize: { width: 280, height: 110, depth: 280 },
            portalMode: 'dynamic',
            itemSpawnMode: 'fallback-random',
            portals: [
                { id: 'portal_1', x: -20, y: 10, z: 0, radius: 18 },
                { id: 'portal_2', x: 20, y: 10, z: 0, radius: 18 },
            ],
            gates: [
                { id: 'gate_legacy', type: 'boost_plus', pos: [0, 12, 0] },
            ],
            items: [
                { id: 'anchor_speed', type: 'item_battery', pickupType: 'SPEED_UP', x: 0, y: 8, z: 12 },
            ],
        };

        const parsed = createMapDocument(sourceDocument);
        const runtime = toArenaMapDefinition(parsed, { mapScale: 1, name: 'qa-map' });

        expect(runtime.map.portalMode).toBe('dynamic');
        expect(runtime.map.itemSpawnMode).toBe('fallback-random');
        expect(runtime.map.gates[0]).toMatchObject({
            type: 'boost',
            legacyType: 'boost_plus',
            warningCode: 'map.warning.gate-type',
        });
        expect(runtime.warnings).toEqual(expect.arrayContaining([
            'Authored portal nodes were ignored because portalMode=dynamic.',
            'Authored item anchors were ignored because itemSpawnMode=fallback-random.',
            'Unknown gate type "boost_plus" normalized to "boost".',
        ]));
    });

    test('T14ec: Recorder-Metriken behalten Gameplay-Result-Codes ueber Item-, Portal- und Gate-Events', async () => {
        const store = new RoundMetricsStore({ timeProvider: () => 12 });
        store.startRound([]);
        store.registerEventType('ITEM_USE', 'mode=shoot type=ROCKET_HEAVY code=item.shoot.success ok=1');
        store.registerEventType('ITEM_PICKUP', 'mode=pickup type=SHIELD code=item.pickup.success ok=1');
        store.registerEventType('PORTAL_USE', 'mode=portal type=PORTAL code=portal.travel ok=1');
        store.registerEventType('GATE_TRIGGER', 'mode=gate type=BOOST code=gate.trigger.boost ok=1');
        store.finalizeRound(null, []);

        const metrics = store.getAggregateMetrics();

        expect(metrics.itemUseTypeTotals.ROCKET_HEAVY).toBe(1);
        expect(metrics.actionResultCodeTotals['item.shoot.success']).toBe(1);
        expect(metrics.actionResultCodeTotals['item.pickup.success']).toBe(1);
        expect(metrics.actionResultCodeTotals['portal.travel']).toBe(1);
        expect(metrics.actionResultCodeTotals['gate.trigger.boost']).toBe(1);
    });

    test('T14ed: Effekt-Neubewertung laesst aeltere Speed-Effekte nach Konflikten wieder greifen', async () => {
        const player = {
            entityRuntimeConfig: {
                ...CONFIG,
                HUNT: { ...CONFIG.HUNT, ACTIVE_MODE: 'CLASSIC', DEFAULT_MODE: 'CLASSIC', ENABLED: true },
            },
            activeEffects: [],
            baseSpeed: CONFIG.PLAYER.SPEED,
            speed: CONFIG.PLAYER.SPEED,
            hasShield: false,
            shieldHP: 0,
            shieldHitFeedback: 0,
            trail: {
                width: CONFIG.TRAIL.WIDTH,
                setWidth(value) { this.width = value; },
                resetWidth() { this.width = CONFIG.TRAIL.WIDTH; },
            },
        };

        applyPlayerPowerup(player, 'SPEED_UP');
        applyPlayerPowerup(player, 'SLOW_DOWN');
        expect(player.baseSpeed).toBeLessThan(CONFIG.PLAYER.SPEED);

        const speedUp = player.activeEffects.find((entry) => entry.type === 'SPEED_UP');
        const slowDown = player.activeEffects.find((entry) => entry.type === 'SLOW_DOWN');
        speedUp.remaining = 99;
        slowDown.remaining = 0.01;

        updatePlayerEffects(player, 0.02);

        expect(player.activeEffects.some((entry) => entry.type === 'SLOW_DOWN')).toBeFalsy();
        expect(player.activeEffects.some((entry) => entry.type === 'SPEED_UP')).toBeTruthy();
        expect(player.baseSpeed).toBeGreaterThan(CONFIG.PLAYER.SPEED);
    });

    test('T14ee: Hunt-Shields bleiben persistent, waehrend Legacy-SLOW_TIME im Hunt-Modus entfernt wird', async () => {
        const player = {
            entityRuntimeConfig: {
                ...CONFIG,
                HUNT: { ...CONFIG.HUNT, ACTIVE_MODE: 'HUNT', DEFAULT_MODE: 'HUNT', ENABLED: true },
            },
            activeEffects: [{ type: 'SLOW_TIME', remaining: 10 }],
            baseSpeed: CONFIG.PLAYER.SPEED,
            speed: CONFIG.PLAYER.SPEED,
            hasShield: false,
            shieldHP: 0,
            maxShieldHp: 1,
            shieldHitFeedback: 0,
            trail: {
                width: CONFIG.TRAIL.WIDTH,
                setWidth(value) { this.width = value; },
                resetWidth() { this.width = CONFIG.TRAIL.WIDTH; },
            },
        };

        applyPlayerPowerup(player, 'SHIELD');
        const shieldEffect = player.activeEffects.find((entry) => entry.type === 'SHIELD');
        shieldEffect.remaining = 0.01;

        updatePlayerEffects(player, 0.5);

        expect(player.activeEffects.some((entry) => entry.type === 'SLOW_TIME')).toBeFalsy();
        expect(player.activeEffects.some((entry) => entry.type === 'SHIELD')).toBeTruthy();
        expect(player.hasShield).toBeTruthy();
        expect(player.shieldHP).toBeGreaterThan(0);
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
        await page.context().addInitScript(() => {
            globalThis.__CURVIOS_APP__ = true;
        });
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
        await page.context().addInitScript(() => {
            globalThis.__CURVIOS_APP__ = true;
        });
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
        await page.context().addInitScript(() => {
            globalThis.__CURVIOS_APP__ = true;
        });
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

    test('T41a1: MenuController emittiert multiplayer host/join nur einmal pro Klick', async ({ page }) => {
        await loadGame(page);

        const result = await page.evaluate(async () => {
            const mod = await import('/src/ui/MenuController.js');
            const previousAppFlag = globalThis.__CURVIOS_APP__;
            globalThis.__CURVIOS_APP__ = true;
            const hostButton = document.createElement('button');
            const joinButton = document.createElement('button');
            const lobbyCodeInput = document.createElement('input');
            lobbyCodeInput.value = 'qa-lobby';
            document.body.append(hostButton, joinButton, lobbyCodeInput);

            const events = [];
            const controller = new mod.MenuController({
                ui: {
                    multiplayerHostButton: hostButton,
                    multiplayerJoinButton: joinButton,
                    multiplayerLobbyCodeInput: lobbyCodeInput,
                },
                settings: {
                    menuFeatureFlags: {
                        canHost: true,
                    },
                },
                onEvent: (event) => events.push(event),
            });
            controller.setupListeners();
            hostButton.click();
            joinButton.click();
            controller.dispose();
            hostButton.remove();
            joinButton.remove();
            lobbyCodeInput.remove();
            if (typeof previousAppFlag === 'undefined') {
                delete globalThis.__CURVIOS_APP__;
            } else {
                globalThis.__CURVIOS_APP__ = previousAppFlag;
            }

            return {
                hostCount: events.filter((event) => event.type === mod.MENU_CONTROLLER_EVENT_TYPES.MULTIPLAYER_HOST).length,
                joinCount: events.filter((event) => event.type === mod.MENU_CONTROLLER_EVENT_TYPES.MULTIPLAYER_JOIN).length,
            };
        });

        expect(result.hostCount).toBe(1);
        expect(result.joinCount).toBe(1);
    });

    test('T41b: MenuMultiplayerPanel zeigt Host-Button nur wenn canHost=true', async ({ page }) => {
        await loadGame(page);

        const result = await page.evaluate(async () => {
            const mod = await import('/src/ui/menu/testing/MenuMultiplayerPanel.js');
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

    test('T41c2: MenuMultiplayerBridge meldet fehlgeschlagene Host-Persistenz als Fehler', async ({ page }) => {
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

            const lockOnlyStorage = () => {
                const store = new Map();
                return {
                    getItem(key) {
                        return store.has(key) ? store.get(key) : null;
                    },
                    setItem(key, value) {
                        if (String(key).endsWith('.lock')) {
                            store.set(key, String(value));
                        }
                    },
                    removeItem(key) {
                        store.delete(key);
                    },
                };
            };

            const runtime = {
                eventTarget: {
                    addEventListener() { },
                    removeEventListener() { },
                },
                createBroadcastChannel: () => null,
                now: () => 1_700_000_000_000,
                random: () => 0.123456,
            };

            const bridge = new MenuMultiplayerBridge({
                peerId: 'peer-host',
                storage: lockOnlyStorage(),
                sessionStorage: createMemoryStorage(),
                runtime,
            });

            const hostResult = bridge.host({ actorId: 'host', lobbyCode: 'persist-fail' });
            const sessionState = bridge.getSessionState();
            bridge.dispose();

            return {
                ok: hostResult?.ok === true,
                code: String(hostResult?.code || ''),
                joined: sessionState?.joined === true,
                lobbyCode: String(sessionState?.lobbyCode || ''),
            };
        });

        expect(result.ok).toBeFalsy();
        expect(result.code).toBe('lobby_persist_failed');
        expect(result.joined).toBeFalsy();
        expect(result.lobbyCode).toBe('');
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

    test('T41c3: MenuMultiplayerBridge weist zusaetzliche Joiner bei voller Lobby ab', async ({ page }) => {
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

            let timerCursor = 0;
            const timers = new Map();
            const runtime = {
                eventTarget: {
                    addEventListener() { },
                    removeEventListener() { },
                },
                createBroadcastChannel: () => null,
                now: () => 1_700_000_000_000 + timerCursor,
                random: () => 0.654321,
                setInterval(fn) {
                    const id = `i-${++timerCursor}`;
                    timers.set(id, fn);
                    return id;
                },
                clearInterval(id) {
                    timers.delete(id);
                },
                setTimeout(fn) {
                    const id = `t-${++timerCursor}`;
                    timers.set(id, fn);
                    return id;
                },
                clearTimeout(id) {
                    timers.delete(id);
                },
            };

            const sharedStorage = createMemoryStorage();
            const bridges = [];
            const lobbyCode = 'FULL-QA';

            const hostBridge = new MenuMultiplayerBridge({
                peerId: 'peer-host',
                storage: sharedStorage,
                sessionStorage: createMemoryStorage(),
                runtime,
            });
            bridges.push(hostBridge);
            const hostResult = hostBridge.host({ actorId: 'host', lobbyCode });

            for (let index = 1; index < 10; index += 1) {
                const bridge = new MenuMultiplayerBridge({
                    peerId: `peer-${index}`,
                    storage: sharedStorage,
                    sessionStorage: createMemoryStorage(),
                    runtime,
                });
                bridges.push(bridge);
                bridge.join({ actorId: `player-${index}`, lobbyCode });
            }

            const overflowBridge = new MenuMultiplayerBridge({
                peerId: 'peer-overflow',
                storage: sharedStorage,
                sessionStorage: createMemoryStorage(),
                runtime,
            });
            bridges.push(overflowBridge);

            const overflowResult = overflowBridge.join({ actorId: 'overflow', lobbyCode });
            const snapshot = JSON.parse(
                sharedStorage.getItem('cuviosclash.multiplayer.lobby.FULL-QA') || 'null'
            );

            while (bridges.length > 0) {
                bridges.pop()?.dispose?.();
            }

            return {
                hostOk: hostResult?.ok === true,
                overflowOk: overflowResult?.ok === true,
                overflowCode: String(overflowResult?.code || ''),
                memberCount: Array.isArray(snapshot?.members) ? snapshot.members.length : 0,
            };
        });

        expect(result.hostOk).toBeTruthy();
        expect(result.overflowOk).toBeFalsy();
        expect(result.overflowCode).toBe('lobby_full');
        expect(result.memberCount).toBe(10);
    });

    test('T41c4: MenuMultiplayerBridge verlaengert Presence-Leases bei visibilitychange und Resume', async ({ page }) => {
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

            const createListenerTarget = () => {
                const listeners = new Map();
                return {
                    target: {
                        addEventListener(type, handler) {
                            if (!listeners.has(type)) listeners.set(type, new Set());
                            listeners.get(type).add(handler);
                        },
                        removeEventListener(type, handler) {
                            listeners.get(type)?.delete(handler);
                        },
                    },
                    dispatch(type, event = {}) {
                        for (const handler of Array.from(listeners.get(type) || [])) {
                            handler({ type, ...event });
                        }
                    },
                };
            };

            let now = 1_700_000_000_000;
            let timerCursor = 0;
            const timers = new Map();
            const createRuntimeHarness = (randomValue) => {
                const eventHarness = createListenerTarget();
                const documentHarness = createListenerTarget();
                let visibilityState = 'visible';
                const documentTarget = {
                    addEventListener(type, handler) {
                        documentHarness.target.addEventListener(type, handler);
                    },
                    removeEventListener(type, handler) {
                        documentHarness.target.removeEventListener(type, handler);
                    },
                    get visibilityState() {
                        return visibilityState;
                    },
                };
                return {
                    runtime: {
                        global: { document: documentTarget },
                        document: documentTarget,
                        eventTarget: eventHarness.target,
                        createBroadcastChannel: () => null,
                        now: () => now,
                        random: () => randomValue,
                        setInterval(fn) {
                            const id = `i-${++timerCursor}`;
                            timers.set(id, fn);
                            return id;
                        },
                        clearInterval(id) {
                            timers.delete(id);
                        },
                        setTimeout(fn) {
                            const id = `t-${++timerCursor}`;
                            timers.set(id, fn);
                            return id;
                        },
                        clearTimeout(id) {
                            timers.delete(id);
                        },
                    },
                    setVisibility(nextState) {
                        visibilityState = nextState;
                        documentHarness.dispatch('visibilitychange', { visibilityState });
                    },
                    dispatchResume() {
                        eventHarness.dispatch('focus');
                    },
                };
            };

            const sharedStorage = createMemoryStorage();
            const hostHarness = createRuntimeHarness(0.111111);
            const clientHarness = createRuntimeHarness(0.222222);
            const hostBridge = new MenuMultiplayerBridge({
                peerId: 'peer-host',
                storage: sharedStorage,
                sessionStorage: createMemoryStorage(),
                runtime: hostHarness.runtime,
            });
            const clientBridge = new MenuMultiplayerBridge({
                peerId: 'peer-client',
                storage: sharedStorage,
                sessionStorage: createMemoryStorage(),
                runtime: clientHarness.runtime,
            });

            const lobbyCode = 'LEASE-QA';
            hostBridge.host({ actorId: 'host', lobbyCode });
            clientBridge.join({ actorId: 'client', lobbyCode });

            const captureSnapshot = () => JSON.parse(
                sharedStorage.getItem(`cuviosclash.multiplayer.lobby.${lobbyCode}`) || 'null'
            );
            const hostLeaseAt = () => {
                const snapshot = captureSnapshot();
                return Number(
                    snapshot?.members?.find((member) => member.peerId === 'peer-host')?.leaseExpiresAt || 0
                );
            };

            const initialLease = hostLeaseAt();
            now += 1;
            hostHarness.setVisibility('hidden');
            const hiddenLease = hostLeaseAt();

            now += 20_000;
            clientBridge._syncStateFromSnapshot(clientBridge._getSnapshot(lobbyCode), { preserveLobbyCode: true });
            const backgroundState = clientBridge.getSessionState();

            now += 1;
            hostHarness.setVisibility('visible');
            hostHarness.dispatchResume();
            const resumedLease = hostLeaseAt();

            hostBridge.dispose();
            clientBridge.dispose();

            return {
                initialLease,
                hiddenLease,
                resumedLease,
                memberCount: backgroundState.memberCount,
                hostConnected: backgroundState.hostConnected === true,
                isHost: backgroundState.isHost === true,
                role: String(backgroundState.role || ''),
            };
        });

        expect(result.hiddenLease).toBeGreaterThan(result.initialLease);
        expect(result.resumedLease).toBeGreaterThan(result.hiddenLease);
        expect(result.memberCount).toBe(2);
        expect(result.hostConnected).toBeTruthy();
        expect(result.isHost).toBeFalsy();
        expect(result.role).toBe('client');
    });

    test('T41c5: MenuMultiplayerBridge verhindert implizite Host-Promotion nach Host-Stale und erlaubt nur manuelles Re-Hosting', async ({ page }) => {
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

            let now = 1_700_000_100_000;
            let timerCursor = 0;
            const timers = new Map();
            const createRuntime = (randomValue) => ({
                global: {},
                eventTarget: {
                    addEventListener() { },
                    removeEventListener() { },
                },
                createBroadcastChannel: () => null,
                now: () => now,
                random: () => randomValue,
                setInterval(fn) {
                    const id = `i-${++timerCursor}`;
                    timers.set(id, fn);
                    return id;
                },
                clearInterval(id) {
                    timers.delete(id);
                },
                setTimeout(fn) {
                    const id = `t-${++timerCursor}`;
                    timers.set(id, fn);
                    return id;
                },
                clearTimeout(id) {
                    timers.delete(id);
                },
            });

            const sharedStorage = createMemoryStorage();
            const hostBridge = new MenuMultiplayerBridge({
                peerId: 'peer-host',
                storage: sharedStorage,
                sessionStorage: createMemoryStorage(),
                runtime: createRuntime(0.111111),
            });
            const clientBridge = new MenuMultiplayerBridge({
                peerId: 'peer-client',
                storage: sharedStorage,
                sessionStorage: createMemoryStorage(),
                runtime: createRuntime(0.222222),
            });

            const lobbyCode = 'STALE-QA';
            hostBridge.host({ actorId: 'host', lobbyCode });
            clientBridge.join({ actorId: 'client', lobbyCode });

            now += 30_000;
            clientBridge._updateHeartbeat();

            now += 35_000;
            clientBridge._updateHeartbeat();
            const staleState = clientBridge.getSessionState();

            const blockedJoinBridge = new MenuMultiplayerBridge({
                peerId: 'peer-join',
                storage: sharedStorage,
                sessionStorage: createMemoryStorage(),
                runtime: createRuntime(0.333333),
            });
            const blockedJoin = blockedJoinBridge.join({ actorId: 'late-client', lobbyCode });

            const recoveryBridge = new MenuMultiplayerBridge({
                peerId: 'peer-rehost',
                storage: sharedStorage,
                sessionStorage: createMemoryStorage(),
                runtime: createRuntime(0.444444),
            });
            const rehostResult = recoveryBridge.host({ actorId: 'rehost', lobbyCode });
            const recoveredState = recoveryBridge.getSessionState();
            const recoveredSnapshot = JSON.parse(
                sharedStorage.getItem(`cuviosclash.multiplayer.lobby.${lobbyCode}`) || 'null'
            );

            recoveryBridge.dispose();
            blockedJoinBridge.dispose();
            clientBridge.dispose();
            hostBridge.dispose();

            return {
                staleIsHost: staleState.isHost === true,
                staleRole: String(staleState.role || ''),
                staleHostConnected: staleState.hostConnected === true,
                staleHostPeerId: String(staleState.hostPeerId || ''),
                staleMemberCount: Number(staleState.memberCount || 0),
                blockedJoinOk: blockedJoin?.ok === true,
                blockedJoinCode: String(blockedJoin?.code || ''),
                rehostOk: rehostResult?.ok === true,
                rehostIsHost: recoveredState.isHost === true,
                recoveredHostPeerId: String(recoveredSnapshot?.hostPeerId || ''),
                recoveredHostRolePeerId: String(
                    recoveredSnapshot?.members?.find((member) => member.role === 'host')?.peerId || ''
                ),
            };
        });

        expect(result.staleIsHost).toBeFalsy();
        expect(result.staleRole).toBe('client');
        expect(result.staleHostConnected).toBeFalsy();
        expect(result.staleHostPeerId).toBe('peer-host');
        expect(result.staleMemberCount).toBe(1);
        expect(result.blockedJoinOk).toBeFalsy();
        expect(result.blockedJoinCode).toBe('host_unavailable');
        expect(result.rehostOk).toBeTruthy();
        expect(result.rehostIsHost).toBeTruthy();
        expect(result.recoveredHostPeerId).toBe('peer-rehost');
        expect(result.recoveredHostRolePeerId).toBe('peer-rehost');
    });

    test('T41d: MenuMultiplayerPanel nutzt Discovery/Host-IP Ports via DI ohne window.curviosApp', async ({ page }) => {
        await loadGame(page);

        const result = await page.evaluate(async () => {
            const mod = await import('/src/ui/menu/testing/MenuMultiplayerPanel.js');
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
        const baselineState = await page.evaluate(() => ({
            mapKey: String(window.GAME_INSTANCE?.settings?.mapKey || ''),
            modePath: String(window.GAME_INSTANCE?.settings?.localSettings?.modePath || ''),
        }));

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
                persistedMapKey: String(persistedSettings?.mapKey || ''),
                persistedModePath: String(persistedSettings?.localSettings?.modePath || ''),
            };
        }, SETTINGS_STORAGE_KEY);

        expect(firstState.startCalls).toBe(1);
        expect(firstState.activePresetId).toBe('arcade');
        expect(firstState.modePath).toBe('quick_action');
        expect(firstState.eventPlaylistState?.activePlaylistId).toBe('fun_rotation');
        expect(firstState.eventPlaylistState?.nextIndex).toBe(1);
        expect(firstState.toastText).toContain('Event-Playlist');
        expect(firstState.persistedEventPlaylistState?.nextIndex).toBe(1);
        expect(firstState.persistedMapKey).toBe(baselineState.mapKey);
        expect(firstState.persistedModePath).toBe(baselineState.modePath);

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

    test('T66a: Vehicle-Manager deckt Filter, 3D-Preview, Upgrade-Overlay und Presets ab', async ({ page }) => {
        await loadGame(page);
        const vehicleIds = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('#vehicle-select-p1 option'))
                .map((option) => String(option?.value || '').trim())
                .filter(Boolean);
        });
        await page.evaluate(({ profileKey, loadoutKey, vehicleIdList }) => {
            const nowIso = new Date().toISOString();
            const unlockedSlots = [
                'core',
                'nose',
                'wing_left',
                'wing_right',
                'engine_left',
                'engine_right',
                'utility',
                'wing_left_t2',
                'wing_right_t2',
                'engine_left_t2',
                'engine_right_t2',
                'core_t2',
                'nose_t2',
                'utility_t2',
                'core_t3',
                'nose_t3',
            ];
            const profiles = {};
            vehicleIdList.forEach((vehicleId) => {
                profiles[vehicleId] = {
                    schemaVersion: 'arcade-vehicle-profile.v1',
                    vehicleId,
                    xp: 999999,
                    level: 30,
                    unlockedSlots: [...unlockedSlots],
                    upgrades: {},
                    createdAt: nowIso,
                    updatedAt: nowIso,
                };
            });
            localStorage.setItem(profileKey, JSON.stringify(profiles));
            localStorage.removeItem(loadoutKey);
        }, {
            profileKey: ARCADE_VEHICLE_PROFILE_STORAGE_KEY,
            loadoutKey: ARCADE_VEHICLE_LOADOUT_STORAGE_KEY,
            vehicleIdList: vehicleIds,
        });

        await page.reload();
        await loadGameWithRetry(page);
        await openCustomSubmenu(page);
        await page.click('#submenu-custom:not(.hidden) [data-mode-path="arcade"]');
        await page.waitForSelector('#arcade-vehicle-manager', { timeout: 5000 });

        const allCount = await page.locator('#arcade-vehicle-manager .arcade-vehicle-card').count();
        expect(allCount).toBeGreaterThan(3);

        await page.evaluate(() => {
            document.querySelector('#arcade-vehicle-manager [data-category=\"jaeger\"]')?.dispatchEvent(
                new MouseEvent('click', { bubbles: true })
            );
        });
        const activeCategory = await page.evaluate(() => {
            return String(document.querySelector('#arcade-vehicle-manager .arcade-vehicle-tab.is-active')?.getAttribute('data-category') || '');
        });
        expect(activeCategory).toBe('jaeger');
        const jaegerState = await page.evaluate(() => {
            const cards = Array.from(document.querySelectorAll('#arcade-vehicle-manager .arcade-vehicle-card'));
            return {
                count: cards.length,
                categories: [...new Set(cards.map((card) => String(card.getAttribute('data-vehicle-category') || '')))],
            };
        });
        expect(jaegerState.count).toBeGreaterThan(0);
        expect(jaegerState.categories).toEqual(['jaeger']);

        await page.fill('#arcade-vehicle-manager .arcade-vehicle-search', 'drone');
        const droneCount = await page.locator('#arcade-vehicle-manager .arcade-vehicle-card').count();
        expect(droneCount).toBeGreaterThanOrEqual(1);
        await page.locator('#arcade-vehicle-manager .arcade-vehicle-card').first().click({ force: true });

        const previewState = await page.evaluate(() => ({
            status: String(document.getElementById('arcade-vehicle-manager')?.dataset?.previewStatus || ''),
            hasCanvas: !!document.querySelector('#arcade-vehicle-manager .arcade-vehicle-preview-canvas-node'),
            hasOverlayDots: document.querySelectorAll('#arcade-vehicle-manager .arcade-vehicle-slot-dot').length,
        }));
        expect(previewState.status).toBe('ready');
        expect(previewState.hasCanvas).toBeTruthy();
        expect(previewState.hasOverlayDots).toBeGreaterThanOrEqual(3);

        const tiersBefore = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('#arcade-vehicle-manager .arcade-vehicle-slot-tier'))
                .map((node) => String(node.textContent || ''));
        });
        const clickedOverlay = await page.evaluate(() => {
            const button = document.querySelector('#arcade-vehicle-manager .arcade-vehicle-slot-dot:not(.is-disabled):not(.hidden)');
            if (!button) return false;
            button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
            return true;
        });
        if (!clickedOverlay) {
            await page.locator('#arcade-vehicle-manager .arcade-vehicle-upgrade-btn:not([disabled])').first().click({ force: true });
        }
        await page.waitForTimeout(120);
        const tiersAfter = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('#arcade-vehicle-manager .arcade-vehicle-slot-tier'))
                .map((node) => String(node.textContent || ''));
        });
        expect(tiersAfter.join('|')).not.toBe(tiersBefore.join('|'));

        await page.fill('#arcade-vehicle-manager .arcade-vehicle-preset-input', 'QA Slot Preset');
        await page.locator('#arcade-vehicle-manager .arcade-vehicle-preset-save').click({ force: true });
        const presetCount = await page.locator('#arcade-vehicle-manager .arcade-vehicle-preset-select option').count();
        expect(presetCount).toBeGreaterThan(0);

        await page.screenshot({ path: 'test-results/v66-vehicle-manager-panel.png', fullPage: true });
        await returnToMenu(page);
    });

    test('T66b: Vehicle-Selection bleibt zwischen Arcade-Manager, Settings, Snapshot und Spawn konsistent', async ({ page }) => {
        await loadGame(page);
        await page.evaluate((lastRunKey) => localStorage.removeItem(lastRunKey), ARCADE_LAST_RUN_STORAGE_KEY);

        await openCustomSubmenu(page);
        await page.click('#submenu-custom:not(.hidden) [data-mode-path="arcade"]');
        await page.waitForSelector('#arcade-vehicle-manager', { timeout: 5000 });

        const selectedVehicleId = await page.evaluate(() => {
            const cards = Array.from(document.querySelectorAll('#arcade-vehicle-manager .arcade-vehicle-card'));
            const preferred = cards.find((node) => node.getAttribute('data-vehicle-id') === 'drone')
                || cards.find((node) => node.getAttribute('data-vehicle-id') === 'aircraft')
                || cards[0];
            if (!preferred) return '';
            preferred.dispatchEvent(new MouseEvent('click', { bubbles: true }));
            return String(preferred.getAttribute('data-vehicle-id') || '');
        });
        expect(selectedVehicleId).not.toBe('');
        await expect(page.locator('#vehicle-select-p1')).toHaveValue(selectedVehicleId);

        await page.evaluate(() => {
            document.getElementById('btn-arcade-start-inline')?.click();
        });
        await page.waitForFunction(() => {
            const game = window.GAME_INSTANCE;
            return game?.state === 'PLAYING' && (game?.entityManager?.humanPlayers?.length || 0) > 0;
        }, null, { timeout: 60000 });

        const runtimeState = await page.evaluate((lastRunKey) => {
            const game = window.GAME_INSTANCE;
            const snapshot = JSON.parse(localStorage.getItem(lastRunKey) || '{}');
            return {
                selectedVehicleId: String(document.getElementById('vehicle-select-p1')?.value || ''),
                settingsVehicleId: String(game?.settings?.vehicles?.PLAYER_1 || ''),
                snapshotVehicleId: String(snapshot?.vehicleId || ''),
                humanVehicleId: String(game?.entityManager?.humanPlayers?.[0]?.vehicleId || ''),
            };
        }, ARCADE_LAST_RUN_STORAGE_KEY);

        expect(runtimeState.settingsVehicleId).toBe(runtimeState.selectedVehicleId);
        expect(runtimeState.snapshotVehicleId).toBe(runtimeState.selectedVehicleId);
        expect(runtimeState.humanVehicleId).toBe(runtimeState.selectedVehicleId);
        await returnToMenu(page);
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
            game.recorder.logEvent('ITEM_USE', players[0].index, 'mode=shoot type=ROCKET_WEAK');
            game.recorder.logEvent('ITEM_USE', players[0].index, 'mode=mg type=MG');
            game.recorder.logEvent('STUCK', players[1].index, 'wall');
            game.recorder.markPlayerDeath(players[1], 'TRAIL_SELF');
            game.recorder.recordDamageEvent({
                cause: 'MG_BULLET',
                damageResult: {
                    applied: 9,
                    absorbedByShield: 0,
                    hpApplied: 9,
                },
            });
            game.recorder.recordDamageEvent({
                cause: 'ROCKET_WEAK',
                projectileType: 'ROCKET_WEAK',
                damageResult: {
                    applied: 20,
                    absorbedByShield: 5,
                    hpApplied: 15,
                },
            });
            game.recorder.roundStartTime = now - simulatedDurationMs;
            game.matchFlowUiController.onRoundEnd(players[0]);

            return {
                error: '',
                balanceRounds: Number(game.settings?.localSettings?.telemetryState?.balance?.rounds || 0),
                telemetryBalance: game.settings?.localSettings?.telemetryState?.balance || null,
                telemetryRecentRound: game.settings?.localSettings?.telemetryState?.recentRounds?.[0] || null,
            };
        });

        expect(telemetryProbe.error || '').toBe('');
        expect(telemetryProbe.balanceRounds).toBeGreaterThanOrEqual(1);
        expect(Number(telemetryProbe.telemetryBalance?.mgHitsPerRound || 0)).toBeGreaterThanOrEqual(1);
        expect(Number(telemetryProbe.telemetryBalance?.rocketHitsPerRound || 0)).toBeGreaterThanOrEqual(1);
        expect(Number(telemetryProbe.telemetryBalance?.hpDamagePerRound || 0)).toBeGreaterThan(0);
        expect(Number(telemetryProbe.telemetryBalance?.shieldAbsorbPerRound || 0)).toBeGreaterThan(0);
        expect(Number(telemetryProbe.telemetryRecentRound?.itemUseByMode?.shoot || 0)).toBe(1);
        expect(Number(telemetryProbe.telemetryRecentRound?.itemUseByMode?.mg || 0)).toBe(1);
        expect(Number(telemetryProbe.telemetryRecentRound?.itemUseByType?.ROCKET_WEAK || 0)).toBe(1);
        expect(Number(telemetryProbe.telemetryRecentRound?.mgHits || 0)).toBe(1);
        expect(Number(telemetryProbe.telemetryRecentRound?.rocketHits || 0)).toBe(1);
        expect(Number(telemetryProbe.telemetryRecentRound?.hpDamage || 0)).toBeGreaterThan(0);
        expect(Number(telemetryProbe.telemetryRecentRound?.shieldAbsorb || 0)).toBeGreaterThan(0);

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
        expect(Number(dashboardState.telemetry?.balance?.mgHitsPerRound || 0)).toBeGreaterThanOrEqual(1);
        expect(Number(dashboardState.telemetry?.balance?.rocketHitsPerRound || 0)).toBeGreaterThanOrEqual(1);
        expect(Number(dashboardState.telemetry?.balance?.hpDamagePerRound || 0)).toBeGreaterThan(0);
        expect(Number(dashboardState.telemetry?.balance?.shieldAbsorbPerRound || 0)).toBeGreaterThan(0);
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

    test('T20l2: Cinematic-Aufnahme meldet WebCodecs-Starts als MP4', async ({ page }) => {
        await page.goto('/', { waitUntil: 'commit' });
        await page.waitForFunction(() => !!window.GAME_INSTANCE, null, { timeout: 30000 });
        const result = await page.evaluate(async () => {
            const game = window.GAME_INSTANCE;
            const messages = [];
            const originalShowStatusToast = game._showStatusToast;
            const originalRender = game.render;
            const originalSetRecordingCaptureSettings = game.renderer?.setRecordingCaptureSettings;
            const recorder = {
                setRecordingCaptureSettings() { },
                async startRecording() {
                    return {
                        started: true,
                        recorderEngine: 'webcodecs-native',
                    };
                },
            };

            game._showStatusToast = (message) => messages.push(String(message || ''));
            game.render = () => { };
            if (game.renderer) {
                game.renderer.setRecordingCaptureSettings = () => { };
            }

            try {
                await game._startCinematicRecording(recorder);
                return {
                    message: messages[messages.length - 1] || '',
                };
            } finally {
                game._showStatusToast = originalShowStatusToast;
                game.render = originalRender;
                if (game.renderer && originalSetRecordingCaptureSettings) {
                    game.renderer.setRecordingCaptureSettings = originalSetRecordingCaptureSettings;
                }
            }
        });

        expect(result.message).toContain('MP4');
        expect(result.message).not.toContain('WebM');
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

    test('T20qa: Start-Setup zeigt Fallback im UI ohne stille Vehicle-Reparatur im Settings-State', async ({ page }) => {
        await loadGame(page);
        await openGameSubmenu(page);
        const repairedState = await page.evaluate(() => {
            const game = window.GAME_INSTANCE;
            game.settings.vehicles.PLAYER_1 = 'missing_vehicle';
            game.runtimeFacade.onSettingsChanged({ changedKeys: ['vehicles.player1'] });
            return {
                domValue: document.getElementById('vehicle-select-p1')?.value ?? '',
                settingsValue: game.settings?.vehicles?.PLAYER_1 ?? '',
                validationField: game.runtimeFacade?._resolveStartValidationIssue?.()?.fieldKey ?? '',
            };
        });

        expect(repairedState.domValue).toBeTruthy();
        expect(repairedState.domValue).not.toBe('missing_vehicle');
        expect(repairedState.settingsValue).toBe('missing_vehicle');
        expect(repairedState.validationField).toBe('');
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

    test('T70a: syncAll/syncByChangeKeys mutieren map/vehicle ohne Input nicht still', async ({ page }) => {
        await loadGame(page);
        await openCustomSubmenu(page);
        await page.click('#submenu-custom:not(.hidden) [data-mode-path="normal"]');
        await page.waitForSelector('#submenu-game:not(.hidden)', { timeout: 5000 });

        const state = await page.evaluate(() => {
            const game = window.GAME_INSTANCE;
            game.settings.localSettings.modePath = 'normal';
            game.settings.mapKey = 'parcours_rift';
            game.settings.vehicles.PLAYER_1 = 'ghost_ship_1';
            game.settings.vehicles.PLAYER_2 = 'ghost_ship_2';
            const before = {
                mapKey: String(game.settings.mapKey || ''),
                vehicleP1: String(game.settings?.vehicles?.PLAYER_1 || ''),
                vehicleP2: String(game.settings?.vehicles?.PLAYER_2 || ''),
            };

            game.uiManager.syncAll();
            const afterSyncAll = {
                mapKey: String(game.settings.mapKey || ''),
                vehicleP1: String(game.settings?.vehicles?.PLAYER_1 || ''),
                vehicleP2: String(game.settings?.vehicles?.PLAYER_2 || ''),
            };

            game.uiManager.syncByChangeKeys(['session.modePath']);
            const afterSyncByKeys = {
                mapKey: String(game.settings.mapKey || ''),
                vehicleP1: String(game.settings?.vehicles?.PLAYER_1 || ''),
                vehicleP2: String(game.settings?.vehicles?.PLAYER_2 || ''),
            };

            return {
                before,
                afterSyncAll,
                afterSyncByKeys,
                uiMapValue: String(document.getElementById('map-select')?.value || ''),
                uiVehicleP1Value: String(document.getElementById('vehicle-p1')?.value || ''),
                uiVehicleP2Value: String(document.getElementById('vehicle-p2')?.value || ''),
            };
        });

        expect(state.afterSyncAll.mapKey).toBe(state.before.mapKey);
        expect(state.afterSyncAll.vehicleP1).toBe(state.before.vehicleP1);
        expect(state.afterSyncAll.vehicleP2).toBe(state.before.vehicleP2);
        expect(state.afterSyncByKeys.mapKey).toBe(state.before.mapKey);
        expect(state.afterSyncByKeys.vehicleP1).toBe(state.before.vehicleP1);
        expect(state.afterSyncByKeys.vehicleP2).toBe(state.before.vehicleP2);
        expect(state.uiMapValue).not.toBe(state.before.mapKey);
        expect(state.uiVehicleP1Value).not.toBe(state.before.vehicleP1);
        expect(state.uiVehicleP2Value).not.toBe(state.before.vehicleP2);
    });

    test('T70b: Legacy-Migration plus Session-Drafts behalten modePath/Preset stabil ueber Reload', async ({ page }) => {
        await loadGame(page);
        const versionState = await page.evaluate(({ settingsStorageKey, menuDraftsStorageKey }) => {
            const game = window.GAME_INSTANCE;
            const defaults = game.settingsManager.createDefaultSettings();
            const targetVersion = Number(defaults?.settingsVersion || 1);
            const legacyVersion = Math.max(0, targetVersion - 1);
            const legacySnapshot = {
                ...defaults,
                settingsVersion: legacyVersion,
                mode: '1p',
                mapKey: 'maze',
                vehicles: {
                    ...(defaults?.vehicles || {}),
                    PLAYER_1: 'ship5',
                    PLAYER_2: 'ship8',
                },
                localSettings: {
                    ...(defaults?.localSettings || {}),
                    sessionType: 'single',
                    modePath: 'normal',
                },
            };
            localStorage.removeItem(menuDraftsStorageKey);
            localStorage.setItem(settingsStorageKey, JSON.stringify(legacySnapshot));
            return { targetVersion, legacyVersion };
        }, {
            settingsStorageKey: SETTINGS_STORAGE_KEY,
            menuDraftsStorageKey: MENU_DRAFTS_STORAGE_KEY,
        });

        await page.reload();
        await page.waitForSelector('#main-menu', { state: 'visible', timeout: 15000 });

        const migratedState = await page.evaluate((settingsStorageKey) => {
            const game = window.GAME_INSTANCE;
            const persisted = JSON.parse(localStorage.getItem(settingsStorageKey) || '{}');
            return {
                runtimeVersion: Number(game?.settings?.settingsVersion || 0),
                runtimeMapKey: String(game?.settings?.mapKey || ''),
                persistedVersion: Number(persisted?.settingsVersion || 0),
                persistedMapKey: String(persisted?.mapKey || ''),
            };
        }, SETTINGS_STORAGE_KEY);
        expect(migratedState.runtimeVersion).toBe(versionState.targetVersion);
        expect(migratedState.persistedVersion).toBe(versionState.targetVersion);
        expect(migratedState.runtimeMapKey).toBe('maze');
        expect(migratedState.persistedMapKey).toBe('maze');

        await openCustomSubmenu(page);
        await page.click('#submenu-custom:not(.hidden) [data-mode-path="arcade"]');
        await page.waitForSelector('#submenu-game:not(.hidden)', { timeout: 5000 });

        const switchState = await page.evaluate(({ menuDraftsStorageKey }) => {
            const game = window.GAME_INSTANCE;
            localStorage.removeItem(menuDraftsStorageKey);
            const resultToSplit = game.settingsManager.switchSessionType(game.settings, 'splitscreen');
            const afterSplit = {
                success: !!resultToSplit?.success,
                loadedDraft: !!resultToSplit?.loadedDraft,
                sessionType: String(game?.settings?.localSettings?.sessionType || ''),
                modePath: String(game?.settings?.localSettings?.modePath || ''),
                activePresetId: String(game?.settings?.matchSettings?.activePresetId || ''),
                mapKey: String(game?.settings?.mapKey || ''),
            };
            const resultBackSingle = game.settingsManager.switchSessionType(game.settings, 'single');
            const afterSingle = {
                success: !!resultBackSingle?.success,
                loadedDraft: !!resultBackSingle?.loadedDraft,
                sessionType: String(game?.settings?.localSettings?.sessionType || ''),
                modePath: String(game?.settings?.localSettings?.modePath || ''),
                activePresetId: String(game?.settings?.matchSettings?.activePresetId || ''),
                mapKey: String(game?.settings?.mapKey || ''),
            };
            return { afterSplit, afterSingle };
        }, {
            menuDraftsStorageKey: MENU_DRAFTS_STORAGE_KEY,
        });

        expect(switchState.afterSplit.success).toBeTruthy();
        expect(switchState.afterSplit.loadedDraft).toBeFalsy();
        expect(switchState.afterSplit.sessionType).toBe('splitscreen');
        expect(switchState.afterSplit.modePath).toBe('arcade');
        expect(switchState.afterSplit.activePresetId).toBe('arcade');
        expect(switchState.afterSplit.mapKey).toBe('parcours_rift');

        expect(switchState.afterSingle.success).toBeTruthy();
        expect(switchState.afterSingle.loadedDraft).toBeTruthy();
        expect(switchState.afterSingle.sessionType).toBe('single');
        expect(switchState.afterSingle.modePath).toBe('arcade');
        expect(switchState.afterSingle.activePresetId).toBe('arcade');
        expect(switchState.afterSingle.mapKey).toBe('parcours_rift');
    });

    test('T68a: Arcade-HUD zeigt Score-Breakdown und Modifier-Update live im Run', async ({ page }) => {
        await loadGame(page);
        await openCustomSubmenu(page);
        await page.click('#submenu-custom:not(.hidden) [data-mode-path="arcade"]');
        await page.waitForSelector('#submenu-game:not(.hidden)', { timeout: 5000 });
        await page.click('#submenu-game:not(.hidden) #btn-start');
        await page.waitForFunction(() => window.GAME_INSTANCE?.state === 'PLAYING', null, { timeout: 60000 });

        const initialHudState = await page.evaluate(() => {
            const game = window.GAME_INSTANCE;
            const runtime = game?.runtimeFacade?.arcadeRunRuntime;
            if (!runtime || !runtime._state) return null;

            runtime._activeModifierId = 'portal_storm';
            runtime._missionState = {
                missions: [
                    { type: 'KILL_COUNT', completed: false, progress: { kills: 2, target: 5 } },
                    { type: 'COLLECT_ITEMS', completed: false, progress: { collected: 1, target: 3 } },
                ],
                allCompleted: false,
                completedCount: 0,
            };

            const previousScore = runtime._state.score && typeof runtime._state.score === 'object'
                ? runtime._state.score
                : {};
            const previousBreakdown = previousScore.breakdown && typeof previousScore.breakdown === 'object'
                ? previousScore.breakdown
                : {};
            runtime._state = {
                ...runtime._state,
                phase: 'sector_active',
                sectorIndex: 3,
                completedSectors: 2,
                missions: runtime._missionState,
                score: {
                    ...previousScore,
                    total: 1337,
                    combo: 9,
                    multiplier: 4,
                    breakdown: {
                        ...previousBreakdown,
                        base: 250,
                        survival: 420,
                        kills: 350,
                        cleanSector: 120,
                        risk: 90,
                        penalty: 40,
                        total: 1337,
                    },
                },
            };

            game?.hudRuntimeSystem?.updatePlayingHudTick?.(0.06);
            const scoreRoot = document.getElementById('arcade-score-hud');
            const missionRoot = document.getElementById('arcade-mission-hud');
            return {
                scoreVisible: !!scoreRoot && window.getComputedStyle(scoreRoot).display !== 'none',
                missionVisible: !!missionRoot && window.getComputedStyle(missionRoot).display !== 'none',
                scoreText: String(scoreRoot?.textContent || ''),
                modifierLabel: String(scoreRoot?.querySelector('.arcade-score-hud-modifier-label')?.textContent || ''),
                missionCardCount: missionRoot?.querySelectorAll('.arcade-mission-card').length || 0,
            };
        });

        expect(initialHudState).not.toBeNull();
        expect(initialHudState.scoreVisible).toBeTruthy();
        expect(initialHudState.missionVisible).toBeTruthy();
        expect(initialHudState.scoreText).toContain('1337');
        expect(initialHudState.scoreText).toContain('x4.0');
        expect(initialHudState.modifierLabel).toContain('Portal Storm');
        expect(initialHudState.missionCardCount).toBeGreaterThanOrEqual(2);

        const modifierSwitchLabel = await page.evaluate(() => {
            const game = window.GAME_INSTANCE;
            const runtime = game?.runtimeFacade?.arcadeRunRuntime;
            if (!runtime || !runtime._state) return '';
            runtime._activeModifierId = 'boost_tax';
            game?.hudRuntimeSystem?.updatePlayingHudTick?.(0.06);
            return String(document.querySelector('#arcade-score-hud .arcade-score-hud-modifier-label')?.textContent || '');
        });
        expect(modifierSwitchLabel).toContain('Boost Tax');

        await returnToMenu(page);
    });

    test('T68b: Arcade-HUD zeigt Combo-Decay, Sudden-Death-Overlay und Sektor-Transition', async ({ page }) => {
        await loadGame(page);
        await openCustomSubmenu(page);
        await page.click('#submenu-custom:not(.hidden) [data-mode-path="arcade"]');
        await page.waitForSelector('#submenu-game:not(.hidden)', { timeout: 5000 });
        await page.click('#submenu-game:not(.hidden) #btn-start');
        await page.waitForFunction(() => window.GAME_INSTANCE?.state === 'PLAYING', null, { timeout: 60000 });

        const visualState = await page.evaluate(() => {
            const game = window.GAME_INSTANCE;
            const runtime = game?.runtimeFacade?.arcadeRunRuntime;
            if (!runtime || !runtime._state) return null;
            const nowMs = Date.now();
            runtime._state = {
                ...runtime._state,
                phase: 'sudden_death',
                sectorIndex: 5,
                completedSectors: 4,
                currentMapKey: 'maze',
                suddenDeathStartedAtMs: nowMs - 12000,
                score: {
                    ...(runtime._state.score || {}),
                    total: 4200,
                    combo: 7,
                    multiplier: 3.5,
                    lastComboAtMs: nowMs - 7200,
                    breakdown: {
                        ...((runtime._state.score && runtime._state.score.breakdown) || {}),
                        base: 420,
                        survival: 700,
                        kills: 590,
                        cleanSector: 120,
                        risk: 70,
                        penalty: 80,
                        total: 1820,
                    },
                },
            };
            game.hudRuntimeSystem._lastArcadeSectorIndex = 4;
            game.hudRuntimeSystem.updatePlayingHudTick(0.06);
            const scoreRoot = document.getElementById('arcade-score-hud');
            const comboMetric = scoreRoot?.querySelector('.arcade-score-hud-metric');
            const sdOverlay = document.getElementById('arcade-sudden-death-overlay');
            const transitionOverlay = document.getElementById('arcade-sector-transition-overlay');
            return {
                hudVisible: !!scoreRoot && window.getComputedStyle(scoreRoot).display !== 'none',
                edgeGlow: scoreRoot?.classList.contains('is-edge-glow') || false,
                suddenDeathHud: scoreRoot?.classList.contains('is-sudden-death') || false,
                comboDecaying: comboMetric?.classList.contains('is-decaying') || false,
                suddenDeathOverlayVisible: !!sdOverlay && !sdOverlay.classList.contains('hidden'),
                transitionVisible: !!transitionOverlay && !transitionOverlay.classList.contains('hidden'),
                transitionText: String(transitionOverlay?.textContent || ''),
            };
        });

        expect(visualState).not.toBeNull();
        expect(visualState.hudVisible).toBeTruthy();
        expect(visualState.edgeGlow).toBeTruthy();
        expect(visualState.suddenDeathHud).toBeTruthy();
        expect(visualState.comboDecaying).toBeTruthy();
        expect(visualState.suddenDeathOverlayVisible).toBeTruthy();
        expect(visualState.transitionVisible).toBeTruthy();
        expect(visualState.transitionText).toContain('Sektor 5');

        await returnToMenu(page);
    });

    test('T68c: Arcade-Intermission/Post-Run-Panel mit Reward-Choice und Replay-Fallback', async ({ page }) => {
        await loadGame(page);
        await openCustomSubmenu(page);
        await page.click('#submenu-custom:not(.hidden) [data-mode-path="arcade"]');
        await page.waitForSelector('#submenu-game:not(.hidden)', { timeout: 5000 });
        await page.click('#submenu-game:not(.hidden) #btn-start');
        await page.waitForFunction(() => window.GAME_INSTANCE?.state === 'PLAYING', null, { timeout: 60000 });

        const state = await page.evaluate(() => {
            const game = window.GAME_INSTANCE;
            const runtime = game?.runtimeFacade?.arcadeRunRuntime;
            if (!game || !runtime || !runtime._state) return null;
            runtime.setStrategy?.({
                applyIntermissionHealing: (player) => {
                    const before = Math.max(0, Number(player?.hp) || 0);
                    const maxHp = Math.max(1, Number(player?.maxHp) || 100);
                    const nextHp = Math.min(maxHp, before + 24);
                    player.hp = nextHp;
                    return { healed: Math.max(0, nextHp - before), shieldGranted: 0, requestedHeal: 24 };
                },
            });
            const nowMs = Date.now();
            runtime._state.mapSequence = ['parcours_rift', 'maze', 'trench'];
            runtime._state.encounterSequence = [
                { templateId: 'sector_intro', objectiveId: 'survive_window', squadId: 'scout_duo', modifierId: 'tight_turns', scoreBonus: 0.08 },
                { templateId: 'sector_pressure', objectiveId: 'bounty_hunt', squadId: 'striker_tri', modifierId: 'heat_stress', scoreBonus: 0.12 },
                { templateId: 'sector_hazard', objectiveId: 'hazard_lane', squadId: 'hunter_pack', modifierId: 'portal_storm', scoreBonus: 0.15 },
            ];
            runtime._state.lastSectorSummary = {
                sectorIndex: 2,
                awardedPoints: 1440,
                multiplierApplied: 3,
                comboAtSectorEnd: 8,
                breakdown: { base: 220, survival: 410, kills: 300, cleanSector: 0, risk: 80, penalty: 20, total: 990 },
            };
            runtime._state.lastSectorXp = { earned: 180 };
            runtime._state.completedSectors = 2;
            runtime._state.sectorIndex = 2;
            runtime._state.phase = 'intermission';
            runtime._missionState = {
                missions: [{ completed: true }, { completed: false }, { completed: true }],
                completedCount: 2,
                allCompleted: false,
            };
            runtime._prepareIntermission(nowMs);

            game.state = 'ROUND_END';
            game.ui.messageOverlay.classList.remove('hidden');
            game.matchFlowUiController.applyMatchUiState({ visibility: { messageOverlayHidden: false }, overlayStats: null });
            const intermissionPanel = document.getElementById('arcade-overlay-panel');
            const choiceButtons = Array.from(document.querySelectorAll('[data-arcade-choice-id]'));
            const rewardButtons = Array.from(document.querySelectorAll('[data-arcade-reward-id]'));
            if (choiceButtons[1]) choiceButtons[1].click();
            if (rewardButtons[1]) rewardButtons[1].click();
            const selectedChoiceId = String(runtime._state?.intermission?.selectedChoiceId || '');
            const selectedRewardId = String(runtime._state?.intermission?.selectedRewardId || '');

            runtime.beginNextSector();
            const syntheticPlayer = {
                isBot: false,
                alive: true,
                maxHp: 120,
                hp: 40,
                maxShieldHp: 40,
                shieldHP: 0,
                hasShield: false,
            };
            const beforeHp = syntheticPlayer.hp;
            const healResult = runtime.applyPendingIntermissionEffects({ players: [syntheticPlayer] }) || null;
            const afterHp = syntheticPlayer.hp;

            runtime._latestReplaySnapshot = {
                matchId: 'arcade-run-replay',
                initialState: { seed: 42 },
                actions: [],
            };
            runtime._state.postRunSummary = {
                score: 4820,
                bestCombo: 11,
                missionCompletionRate: 0.67,
                xpEarned: 240,
                peakMultiplier: 4,
                xpAnimation: { durationMs: 260 },
                scorePerSector: [
                    { sectorIndex: 1, mapKey: 'parcours_rift', awardedPoints: 1200 },
                    { sectorIndex: 2, mapKey: 'maze', awardedPoints: 1440 },
                ],
            };
            runtime._state.replay = { runReplayId: 'arcade-run-replay', playbackEnabled: true };
            game.state = 'MATCH_END';
            game.matchFlowUiController.applyMatchUiState({ visibility: { messageOverlayHidden: false }, overlayStats: null });

            const postRunPanel = document.getElementById('arcade-overlay-panel');
            const replayBtn = document.getElementById('btn-arcade-overlay-replay');
            if (replayBtn) replayBtn.click();
            return {
                intermissionVisible: !!intermissionPanel && !intermissionPanel.classList.contains('hidden'),
                intermissionChoiceCount: choiceButtons.length,
                intermissionRewardCount: rewardButtons.length,
                selectedChoiceId,
                selectedRewardId,
                healedDelta: Math.max(0, afterHp - beforeHp),
                healedPlayers: Math.max(0, Number(healResult?.playersAffected) || 0),
                postRunVisible: !!postRunPanel && !postRunPanel.classList.contains('hidden'),
                replayCode: String(game.runtimeFacade.arcadeRunRuntime?.requestReplayPlayback?.()?.code || ''),
                replayButtonExists: !!replayBtn,
                menuReplayLabel: String(document.querySelector('#btn-arcade-replay')?.textContent || ''),
                menuDailyLabel: String(document.querySelector('#btn-arcade-daily')?.textContent || ''),
            };
        });

        expect(state).not.toBeNull();
        expect(state.intermissionVisible).toBeTruthy();
        expect(state.intermissionChoiceCount).toBeGreaterThanOrEqual(2);
        expect(state.intermissionRewardCount).toBeGreaterThanOrEqual(2);
        expect(state.selectedChoiceId).not.toBe('');
        expect(state.selectedRewardId).not.toBe('');
        expect(state.healedDelta).toBeGreaterThan(0);
        expect(state.healedPlayers).toBeGreaterThan(0);
        expect(state.postRunVisible).toBeTruthy();
        expect(state.replayCode).toBe('replay_player_unavailable');
        expect(state.replayButtonExists).toBeTruthy();
        expect(state.menuReplayLabel).toContain('Replay');
        expect(state.menuReplayLabel).not.toContain('Platzhalter');
        expect(state.menuDailyLabel).toContain('Daily');
        expect(state.menuDailyLabel).not.toContain('Platzhalter');

        await returnToMenu(page);
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

    test('T20ai4: Third-Person-Cinematic nutzt smoothes Boost-Blend und speed-basierten Sway', async ({ page }) => {
        await startGame(page);
        const result = await page.evaluate(() => {
            const game = window.GAME_INSTANCE;
            const rig = game?.renderer?.cameraRigSystem;
            const cinematic = rig?.cinematicCameraSystem;
            const target = rig?.cameraTargets?.[0];
            if (!game || !rig || !cinematic || !target?.position || !target?.lookAt) {
                return { error: 'missing-runtime' };
            }

            const previousLivePerspectiveEnabled = rig.livePerspectiveEnabled;
            const modes = Array.isArray(game?.config?.CAMERA?.MODES)
                ? game.config.CAMERA.MODES
                : ['THIRD_PERSON', 'FIRST_PERSON', 'TOP_DOWN'];
            const thirdPersonIndex = Math.max(0, modes.indexOf('THIRD_PERSON'));
            const playerPosition = target.position.clone().set(0, 0, 0);
            const playerDirection = target.lookAt.clone().set(0, 0, -1);

            const runScenario = ({ speed, isBoosting }) => {
                cinematic.reset();
                rig.cameraBoostBlend[0] = 0;
                target.position.set(0, 0, 0);
                target.lookAt.set(0, 0, -1);

                let maxSway = 0;
                let maxBoostBlend = 0;
                let finalLookAhead = 0;

                for (let i = 0; i < 90; i++) {
                    rig.updateCamera(
                        0,
                        playerPosition,
                        playerDirection,
                        1 / 60,
                        null,
                        false,
                        isBoosting,
                        null,
                        null,
                        { playerState: { speed } }
                    );
                    maxSway = Math.max(maxSway, Math.abs(Number(target.position.x) || 0));
                    maxBoostBlend = Math.max(maxBoostBlend, Number(rig.cameraBoostBlend[0] || 0));
                    finalLookAhead = target.lookAt.distanceTo(playerPosition);
                }

                return {
                    maxSway,
                    maxBoostBlend,
                    finalLookAhead,
                };
            };

            try {
                rig.livePerspectiveEnabled = false;
                rig.cameraModes[0] = thirdPersonIndex;

                const lowSpeed = runScenario({ speed: 0, isBoosting: false });
                const cruiseSpeed = runScenario({ speed: cinematic.referenceSpeed || 18, isBoosting: false });
                const boosted = runScenario({ speed: cinematic.referenceSpeed || 18, isBoosting: true });

                return {
                    error: null,
                    lowSpeed,
                    cruiseSpeed,
                    boosted,
                };
            } finally {
                rig.livePerspectiveEnabled = previousLivePerspectiveEnabled;
            }
        });

        expect(result.error).toBeNull();
        expect(result.cruiseSpeed.maxSway).toBeGreaterThan(result.lowSpeed.maxSway * 4);
        expect(result.boosted.maxBoostBlend).toBeGreaterThan(0.5);
        expect(result.boosted.maxSway).toBeLessThan(result.cruiseSpeed.maxSway * 0.7);
        expect(result.boosted.finalLookAhead).toBeGreaterThan(result.cruiseSpeed.finalLookAhead);
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

    test('T20aj1a: Recorder behaelt reale Dauer trotz Backlog-Trim bei langen Render-Luecken', async ({ page }) => {
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
            recorder._mediaRecorderSupportsRequestFrame = true;
            recorder._mediaRecorderVideoTrack = {
                requestFrame() { },
            };

            const renderDeltasMs = [1000, 1000, 1000, 1000];
            for (let i = 0; i < renderDeltasMs.length; i++) {
                now += renderDeltasMs[i];
                recorder.captureRenderedFrame(renderDeltasMs[i] / 1000);
            }

            return {
                captureTimestampUs: recorder._captureTimestampUs,
                encodedFrames: recorder._captureEncodedFrames,
                diagnostics: recorder.getRecordingDiagnostics(),
            };
        });

        expect(result.encodedFrames).toBeGreaterThanOrEqual(3);
        expect(result.captureTimestampUs).toBeGreaterThanOrEqual(2_900_000);
        expect(result.diagnostics.frameIntervalStats?.mean || 0).toBeGreaterThan(900);
    });

    test('T20aj1b: Cinematic-WebCodecs nutzt Capture-Aufloesung statt festem 720p-Downscale', async ({ page }) => {
        await loadGame(page);
        const result = await page.evaluate(async () => {
            const { MediaRecorderSystem } = await import('/src/core/MediaRecorderSystem.js');
            const captureCanvas = { width: 1920, height: 1080 };
            const recorder = new MediaRecorderSystem({
                canvas: captureCanvas,
                autoDownload: false,
                captureSourceResolver: () => captureCanvas,
                recordingCaptureSettings: {
                    profile: 'cinematic_mp4',
                    hudMode: 'clean',
                },
                globalScope: {},
            });

            const dimensions = recorder._resolveRecordingDimensions();
            const bitrate = recorder._resolveRecordingBitrate(dimensions.width, dimensions.height);
            recorder.dispose();
            return {
                dimensions,
                bitrate,
            };
        });

        expect(result.dimensions).toEqual({ width: 1920, height: 1080 });
        expect(result.bitrate).toBe(16_000_000);
    });

    test('T20aj1c: Cinematic-Recording behaelt volle Capture-Aufloesung auch unter Lastregelung', async ({ page }) => {
        await loadGame(page);
        const result = await page.evaluate(async () => {
            const { MediaRecorderSystem } = await import('/src/core/MediaRecorderSystem.js');
            const captureCanvas = { width: 1920, height: 1080 };
            const recorder = new MediaRecorderSystem({
                canvas: captureCanvas,
                autoDownload: false,
                captureSourceResolver: () => captureCanvas,
                recordingCaptureSettings: {
                    profile: 'cinematic_mp4',
                    hudMode: 'clean',
                },
                globalScope: {},
            });
            recorder._isRecording = true;
            recorder._activeRecorderEngine = 'webcodecs-native';
            recorder._captureLevelIndex = 5;
            const diagnostics = recorder.getRecordingDiagnostics();
            recorder.dispose();
            return diagnostics;
        });

        expect(result.captureLevel).toBe(5);
        expect(result.captureResolutionScale).toBe(1);
        expect(result.captureSourceWidth).toBe(1920);
        expect(result.captureSourceHeight).toBe(1080);
    });

    test('T20aj1d: Cinematic-Capture orientiert sich an der sichtbaren Viewport-Groesse statt am gedrosselten Backbuffer', async ({ page }) => {
        await loadGame(page);
        const result = await page.evaluate(async () => {
            const { RecordingCapturePipeline } = await import('/src/core/renderer/RecordingCapturePipeline.js');
            const sourceCanvas = document.createElement('canvas');
            sourceCanvas.width = 640;
            sourceCanvas.height = 360;
            sourceCanvas.style.width = '1280px';
            sourceCanvas.style.height = '720px';
            sourceCanvas.style.position = 'fixed';
            sourceCanvas.style.left = '-9999px';
            sourceCanvas.style.top = '0';
            document.body.appendChild(sourceCanvas);

            const pipeline = new RecordingCapturePipeline({
                sourceCanvas,
                sourceRenderer: null,
                scene: null,
            });
            pipeline.setSettings({
                profile: 'cinematic_mp4',
                hudMode: 'clean',
            });
            const captureCanvas = pipeline.getCaptureCanvas();
            const snapshot = {
                sourceWidth: sourceCanvas.width,
                sourceHeight: sourceCanvas.height,
                clientWidth: sourceCanvas.clientWidth,
                clientHeight: sourceCanvas.clientHeight,
                captureWidth: captureCanvas?.width || 0,
                captureHeight: captureCanvas?.height || 0,
            };
            pipeline.dispose();
            sourceCanvas.remove();
            return snapshot;
        });

        expect(result.sourceWidth).toBe(640);
        expect(result.sourceHeight).toBe(360);
        expect(result.clientWidth).toBe(1280);
        expect(result.clientHeight).toBe(720);
        expect(result.captureWidth).toBe(1280);
        expect(result.captureHeight).toBe(720);
    });

    test('T20aj1e: Cinematic-Orbit-Shots weichen vor Arena-Kollisionen zurueck', async ({ page }) => {
        await loadGame(page);
        const result = await page.evaluate(async () => {
            const { RecordingOrbitCameraDirector } = await import('/src/core/renderer/camera/RecordingOrbitCameraDirector.js');
            const game = window.GAME_INSTANCE;
            const baseCamera = game?.renderer?.cameras?.[0] || null;
            const Vector3 = baseCamera?.position?.constructor || null;
            if (!baseCamera?.clone || !Vector3) {
                return null;
            }

            const camera = baseCamera.clone();
            camera.position.set(0, 0, 0);
            camera.fov = 75;
            const director = new RecordingOrbitCameraDirector();
            const playerPosition = new Vector3(0, 0, 0);
            const playerDirection = new Vector3(0, 0, -1);
            const arena = {
                bounds: {
                    min: new Vector3(-50, -50, -50),
                    max: new Vector3(50, 50, 50),
                },
                checkCollision(position, radius = 0) {
                    return position.z >= (3 - radius);
                },
            };

            director.apply({
                playerIndex: 0,
                camera,
                fallbackTarget: { lookAt: new Vector3(0, 0, -6) },
                playerPosition,
                playerDirection,
                dt: 1,
                arena,
                slotStyle: 'cinematic',
                baseFov: 75,
            });

            return {
                z: Number(camera.position.z || 0),
            };
        });

        expect(result).not.toBeNull();
        expect(result.z).toBeLessThan(3.1);
    });

    test('T20aj1f: Desktop-App bevorzugt fuer Recording MediaRecorder mit WebM statt WebCodecs-MP4', async ({ page }) => {
        await loadGame(page);
        const result = await page.evaluate(async () => {
            const { MediaRecorderSystem } = await import('/src/core/MediaRecorderSystem.js');
            const MediaRecorderCtor = function MediaRecorder() {};
            MediaRecorderCtor.isTypeSupported = (mimeType) => String(mimeType || '').includes('webm');
            const recorder = new MediaRecorderSystem({
                canvas: {
                    width: 1280,
                    height: 720,
                    captureStream() {
                        return {};
                    },
                },
                autoDownload: false,
                globalScope: {
                    __CURVIOS_APP__: true,
                    curviosApp: { isApp: true },
                    VideoEncoder: class VideoEncoder {
                        static async isConfigSupported() {
                            return { supported: true };
                        }
                    },
                    VideoFrame: class VideoFrame {},
                    MediaRecorder: MediaRecorderCtor,
                },
            });
            const support = recorder.getSupportState();
            recorder.dispose();
            return support;
        });

        expect(result.recorderEngine).toBe('mediarecorder-native');
        expect(result.selectedMimeType).toContain('webm');
        expect(result.supportReason).toBe('desktop-prefer-mediarecorder');
    });

    test('T20aj1g: Desktop-App speichert Recording-Blobs direkt ueber die App-Bridge', async ({ page }) => {
        await loadGame(page);
        const result = await page.evaluate(async () => {
            const { attemptAutoDownload } = await import('/src/core/recording/DownloadService.js');
            const originalApp = globalThis.curviosApp;
            const originalFetch = globalThis.fetch;
            let appSaveCalls = 0;
            globalThis.curviosApp = {
                saveVideo: async (videoBytes, defaultName, mimeType) => {
                    appSaveCalls += 1;
                    return {
                        saved: videoBytes instanceof Uint8Array
                            && videoBytes.length === 4
                            && defaultName === 'clip.webm'
                            && mimeType === 'video/webm',
                    };
                },
            };
            globalThis.fetch = async () => {
                throw new Error('fetch should not run when app save succeeds');
            };

            try {
                const status = await attemptAutoDownload({
                    blob: new Blob([new Uint8Array([1, 2, 3, 4])], { type: 'video/webm' }),
                    fileName: 'recordings/clip.webm',
                    mimeType: 'video/webm',
                    autoDownload: true,
                    downloadHandler: () => {
                        throw new Error('browser download fallback should not run');
                    },
                    logger: null,
                });
                return {
                    appSaveCalls,
                    status,
                };
            } finally {
                globalThis.curviosApp = originalApp;
                globalThis.fetch = originalFetch;
            }
        });

        expect(result.appSaveCalls).toBe(1);
        expect(result.status.transport).toBe('app');
        expect(result.status.status).toBe('saved_via_app');
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

    test('T20aj4: Recorder nutzt NativeMediaRecorderEngine als Strategie und spiegelt Runtime-State', async ({ page }) => {
        await loadGame(page);
        const result = await page.evaluate(async () => {
            const { MediaRecorderSystem } = await import('/src/core/MediaRecorderSystem.js');
            const sourceCanvas = document.createElement('canvas');
            sourceCanvas.width = 320;
            sourceCanvas.height = 180;

            const fakeTrack = {
                requestFrame() { },
                stop() { },
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
                }
                start() {
                    this.state = 'recording';
                }
                requestData() {
                    const mimeType = this.options?.mimeType || 'video/webm';
                    this.ondataavailable?.({
                        data: new Blob([new Uint8Array([9, 8, 7])], { type: mimeType }),
                    });
                }
                stop() {
                    this.state = 'inactive';
                    Promise.resolve().then(() => {
                        this.onstop?.();
                    });
                }
            }

            HTMLCanvasElement.prototype.captureStream = function captureStreamStub() {
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
                        mediaRecorderMimeType: 'video/webm;codecs=vp9',
                        selectedMimeType: 'video/webm;codecs=vp9',
                        recorderEngine: 'mediarecorder-native',
                        supportReason: 'native-mediarecorder',
                    }),
                });

                const started = await recorder.startRecording({ type: 'strategy-test' });
                const runtimeState = recorder._activeRecorderStrategy?.getRuntimeState?.() || null;
                const strategySnapshot = {
                    started: !!started?.started,
                    strategyName: recorder._activeRecorderStrategy?.constructor?.name || null,
                    mirroredRecorder: recorder._mediaRecorder === runtimeState?.mediaRecorder,
                    mirroredTrack: recorder._mediaRecorderVideoTrack === runtimeState?.mediaRecorderVideoTrack,
                    requestFrameSupported: recorder._mediaRecorderSupportsRequestFrame,
                };
                const stopped = await recorder.stopRecording({ type: 'strategy-stop' });
                recorder.dispose();
                return {
                    ...strategySnapshot,
                    stopped: !!stopped?.stopped,
                };
            } finally {
                HTMLCanvasElement.prototype.captureStream = originalCaptureStream;
            }
        });

        expect(result.started).toBeTruthy();
        expect(result.strategyName).toBe('NativeMediaRecorderEngine');
        expect(result.mirroredRecorder).toBeTruthy();
        expect(result.mirroredTrack).toBeTruthy();
        expect(result.requestFrameSupported).toBeTruthy();
        expect(result.stopped).toBeTruthy();
    });

    test('T20aj4a: Recorder settleRecording teilt Pending-Stop mit Dispose und orphaned keinen Stop-Promise', async ({ page }) => {
        await loadGame(page);
        const result = await page.evaluate(async () => {
            const { MediaRecorderSystem } = await import('/src/core/MediaRecorderSystem.js');
            const sourceCanvas = document.createElement('canvas');
            sourceCanvas.width = 320;
            sourceCanvas.height = 180;

            const fakeTrack = {
                requestFrame() { },
                stop() { },
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
                    FakeMediaRecorder.lastInstance = this;
                }
                start() {
                    this.state = 'recording';
                }
                requestData() {
                    this.requestDataCalls += 1;
                    const mimeType = this.options?.mimeType || 'video/webm';
                    this.ondataavailable?.({
                        data: new Blob([new Uint8Array([4, 5, 6])], { type: mimeType }),
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

            HTMLCanvasElement.prototype.captureStream = function captureStreamStub() {
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

                const started = await recorder.startRecording({ type: 'settle-test' });
                const stopPromise = recorder.stopRecording({ type: 'settle-stop' });
                const settlePromise = recorder.settleRecording({ type: 'settle-recording' });
                recorder.dispose();

                const [stopped, settled] = await Promise.all([stopPromise, settlePromise]);
                await new Promise((resolve) => setTimeout(resolve, 0));

                return {
                    started: !!started?.started,
                    stopStopped: !!stopped?.stopped,
                    settleStopped: !!settled?.stopped,
                    sameStopReason: stopped?.reason === settled?.reason,
                    stopCalls: Number(FakeMediaRecorder.lastInstance?.stopCalls || 0),
                    requestDataCalls: Number(FakeMediaRecorder.lastInstance?.requestDataCalls || 0),
                    pendingStopCleared: recorder._pendingStop === null,
                    stillRecording: recorder.isRecording(),
                };
            } finally {
                HTMLCanvasElement.prototype.captureStream = originalCaptureStream;
            }
        });

        expect(result.started).toBeTruthy();
        expect(result.stopStopped).toBeTruthy();
        expect(result.settleStopped).toBeTruthy();
        expect(result.sameStopReason).toBeTruthy();
        expect(result.stopCalls).toBe(1);
        expect(result.requestDataCalls).toBe(1);
        expect(result.pendingStopCleared).toBeTruthy();
        expect(result.stillRecording).toBeFalsy();
    });

    test('T20aj5: WebCodecs-Stop finalisiert Partial-Buffer wenn flush haengt', async ({ page }) => {
        await page.goto('/', { waitUntil: 'domcontentloaded' });
        const result = await page.evaluate(async () => {
            const { WebCodecsRecorderEngine } = await import('/src/core/recording/engines/WebCodecsRecorderEngine.js');
            const engine = new WebCodecsRecorderEngine({ globalScope: {} });
            let resetCalls = 0;
            let closeCalls = 0;
            let finalizeCalls = 0;

            engine._muxer = {
                finalize() {
                    finalizeCalls += 1;
                },
                target: {
                    buffer: new ArrayBuffer(8),
                },
            };
            engine._videoEncoder = {
                state: 'configured',
                encodeQueueSize: 9,
                flush() {
                    return new Promise(() => { });
                },
                reset() {
                    resetCalls += 1;
                    this.state = 'unconfigured';
                },
                close() {
                    closeCalls += 1;
                    this.state = 'closed';
                },
            };

            const startedAt = performance.now();
            const stopResult = await engine.stop();
            const elapsedMs = performance.now() - startedAt;

            return {
                elapsedMs,
                resetCalls,
                closeCalls,
                finalizeCalls,
                stopResult: {
                    ok: !!stopResult?.ok,
                    mimeType: stopResult?.mimeType || null,
                    bufferSize: Number(stopResult?.bufferSize || 0),
                    blobSize: stopResult?.blob instanceof Blob ? stopResult.blob.size : 0,
                    partial: stopResult?.partial === true,
                    partialReason: stopResult?.partialReason || null,
                },
            };
        });

        expect(result.elapsedMs).toBeLessThan(5000);
        expect(result.resetCalls).toBe(1);
        expect(result.finalizeCalls).toBe(1);
        expect(result.closeCalls).toBeLessThanOrEqual(1);
        expect(result.stopResult.ok).toBeTruthy();
        expect(result.stopResult.mimeType).toBe('video/mp4');
        expect(result.stopResult.bufferSize).toBe(8);
        expect(result.stopResult.blobSize).toBe(8);
        expect(result.stopResult.partial).toBeTruthy();
        expect(result.stopResult.partialReason).toBe('flush_timeout');
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
                    teardownRuntimeSession() { },
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

    test('T20ae2: PauseOverlayController delegiert Return-to-Menu an den Lifecycle-Port', async ({ page }) => {
        await loadGame(page);
        const result = await page.evaluate(async () => {
            const { PauseOverlayController } = await import('/src/ui/PauseOverlayController.js');

            const makeButton = () => document.createElement('button');
            const makeCheckbox = () => {
                const input = document.createElement('input');
                input.type = 'checkbox';
                return input;
            };

            let lifecycleReturnCalls = 0;
            let sessionTeardownCalls = 0;
            let runtimeTeardownCalls = 0;

            const game = {
                state: 'PAUSED',
                ui: {
                    pauseOverlay: document.createElement('div'),
                    pauseResumeButton: makeButton(),
                    pauseSettingsButton: makeButton(),
                    pauseSettingsBackButton: makeButton(),
                    pauseMenuButton: makeButton(),
                    pauseSettingsPanel: document.createElement('div'),
                    pauseKeybindP1: document.createElement('div'),
                    pauseKeybindP2: document.createElement('div'),
                    pauseAutoRollToggle: makeCheckbox(),
                    pauseInvertP1: makeCheckbox(),
                    pauseInvertP2: makeCheckbox(),
                },
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
                    teardownRuntimeSession() { runtimeTeardownCalls += 1; },
                },
            };

            const controller = new PauseOverlayController({
                matchFlowUiController: {
                    game,
                    returnToMenu() {
                        throw new Error('matchFlow fallback should not run while lifecyclePort exists');
                    },
                },
                game,
                ports: {
                    lifecyclePort: {
                        returnToMenu() {
                            lifecycleReturnCalls += 1;
                        },
                    },
                    sessionPort: {
                        teardownMatchSession() {
                            sessionTeardownCalls += 1;
                        },
                    },
                },
            });

            controller.returnToMenuFromPause();

            return {
                lifecycleReturnCalls,
                sessionTeardownCalls,
                runtimeTeardownCalls,
            };
        });

        expect(result.lifecycleReturnCalls).toBe(1);
        expect(result.sessionTeardownCalls).toBe(0);
        expect(result.runtimeTeardownCalls).toBe(0);
    });

    test('T20ae3: RuntimeSessionLifecycle puffert fruehe stateUpdate-Pakete und wartet als Client auf Host-Startsignal', async ({ page }) => {
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

    test('T20ae4: MatchStartValidation scoped Lobby-Regeln nur auf Menu-Storage-Bridge', async ({ page }) => {
        await loadGame(page);
        const result = await page.evaluate(async () => {
            const game = window.GAME_INSTANCE;
            const { resolveMatchStartValidationIssue } = await import('/src/core/runtime/MatchStartValidationService.js');

            const baseSettings = JSON.parse(JSON.stringify(game?.settings || {}));
            baseSettings.mapKey = String(baseSettings.mapKey || 'standard');
            baseSettings.gameMode = 'CLASSIC';
            baseSettings.localSettings = {
                ...(baseSettings.localSettings || {}),
                modePath: 'normal',
                themeMode: 'dunkel',
            };
            baseSettings.vehicles = {
                ...(baseSettings.vehicles || {}),
                PLAYER_1: baseSettings?.vehicles?.PLAYER_1 || 'ship5',
            };

            const storageBridgeSettings = {
                ...baseSettings,
                localSettings: {
                    ...baseSettings.localSettings,
                    sessionType: 'multiplayer',
                    multiplayerTransport: 'storage-bridge',
                },
            };
            const lanSettings = {
                ...baseSettings,
                localSettings: {
                    ...baseSettings.localSettings,
                    sessionType: 'lan',
                    multiplayerTransport: 'lan',
                },
            };

            const maps = game?.config?.MAPS || { standard: { key: 'standard' } };
            const storageBridgeIssue = resolveMatchStartValidationIssue({
                settings: storageBridgeSettings,
                maps,
                classicModeType: 'CLASSIC',
                huntModeType: 'HUNT',
            });
            const lanIssue = resolveMatchStartValidationIssue({
                settings: lanSettings,
                maps,
                classicModeType: 'CLASSIC',
                huntModeType: 'HUNT',
            });

            return {
                storageBridgeField: storageBridgeIssue?.fieldKey || null,
                lanField: lanIssue?.fieldKey || null,
            };
        });

        expect(result.storageBridgeField).toBe('multiplayer');
        expect(result.lanField).not.toBe('multiplayer');
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

    test.skip('T10f: Editor-Disk-Maps erscheinen im Runtime-Menue und laden im Match', async ({ page }) => {
        await loadGameWithRetry(page);
        await openGameSubmenu(page);

        const selectionState = await page.evaluate(() => {
            const options = Array.from(document.querySelectorAll('#map-select option')).map((option) => ({
                value: String(option.value || ''),
                text: String(option.textContent || ''),
            }));
            const matching = options.find((entry) => entry.value.startsWith('editor_')) || null;
            return {
                matching,
                optionCount: options.length,
            };
        });

        if (!selectionState.matching) {
            test.skip();
            return;
        }

        const selectedEditorMapKey = String(selectionState.matching.value || '');
        expect(selectionState.optionCount).toBeGreaterThan(0);
        expect(selectedEditorMapKey.startsWith('editor_')).toBeTruthy();

        await page.evaluate((mapKey) => {
            const game = window.GAME_INSTANCE;
            if (!game?.settings) return;
            game.settings.mapKey = mapKey;
            game.runtimeFacade?.onSettingsChanged?.({ changedKeys: ['mapKey'] });
        }, selectedEditorMapKey);
        await page.waitForTimeout(200);

        const runtimeSelection = await page.evaluate(() => ({
            domValue: document.getElementById('map-select')?.value ?? null,
            settingsMapKey: window.GAME_INSTANCE?.settings?.mapKey ?? null,
        }));

        expect(runtimeSelection.domValue).toBe(selectedEditorMapKey);
        expect(runtimeSelection.settingsMapKey).toBe(selectedEditorMapKey);
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

        expect(matchProbe.mapKey).toBe(selectedEditorMapKey);
        expect(matchProbe.obstacleCount).toBeGreaterThanOrEqual(1);
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

// ---------------------------------------------------------------------------
// V74 Regression Tests - Runtime-Entkopplung
// ---------------------------------------------------------------------------
test.describe('V74: Runtime-Decoupling Regressions', () => {
    test('V74.3 Stale async session init disposes replaced prepared match before apply', async ({ page }) => {
        await loadGame(page);
        const result = await page.evaluate(async () => {
            const { MatchLifecycleSessionOrchestrator } = await import('/src/state/MatchLifecycleSessionOrchestrator.js');

            let resolveFirstInit = null;
            let prepareCalls = 0;
            let currentSession = null;
            const disposed = [];
            const applied = [];
            const wired = [];
            const firstInit = new Promise((resolve) => {
                resolveFirstInit = resolve;
            });

            const deps = {
                getLifecycleState: () => ({
                    mapKey: 'standard',
                    numHumans: 1,
                    numBots: 0,
                    winsNeeded: 3,
                    activeGameMode: 'CLASSIC',
                }),
                notifyLifecycleEvent() { },
                prepareInitializedMatchSession: () => {
                    prepareCalls += 1;
                    if (prepareCalls === 1) {
                        return firstInit;
                    }
                    return Promise.resolve({
                        session: {
                            id: 'second-session',
                            effectiveMapKey: 'standard',
                            numHumans: 1,
                            numBots: 0,
                            winsNeeded: 3,
                        },
                    });
                },
                wireInitializedMatchRuntime: (initializedMatch) => {
                    wired.push(initializedMatch?.session?.id || null);
                    return {
                        ...initializedMatch,
                        runtime: { id: `runtime-${initializedMatch?.session?.id || 'unknown'}` },
                    };
                },
                applyInitializedMatchSession: (initializedMatch) => {
                    const sessionId = initializedMatch?.session?.id || null;
                    applied.push(sessionId);
                    currentSession = {
                        entityManager: { players: [], getHumanPlayers() { return []; } },
                        powerupManager: { clear() { } },
                        sessionId,
                    };
                },
                getCurrentMatchSessionRefs: () => currentSession,
                clearMatchSessionRefs: () => {
                    currentSession = null;
                },
                disposePreparedMatchSession: (initializedMatch, options = {}) => {
                    disposed.push({
                        id: initializedMatch?.session?.id || null,
                        reason: options.reason || null,
                        clearScene: options.clearScene === true,
                    });
                },
                disposeCurrentMatchSession() { },
                settleRecorder() {
                    return null;
                },
                resetRoundRuntime() { },
            };

            const orchestrator = new MatchLifecycleSessionOrchestrator(deps);
            const firstPromise = orchestrator.createMatchSession({});
            const secondPromise = orchestrator.createMatchSession({});

            resolveFirstInit({
                session: {
                    id: 'first-session',
                    effectiveMapKey: 'standard',
                    numHumans: 1,
                    numBots: 0,
                    winsNeeded: 3,
                },
            });

            const [firstResult, secondResult] = await Promise.all([firstPromise, secondPromise]);
            return {
                prepareCalls,
                wired,
                applied,
                disposed,
                firstResultIsNull: firstResult === null,
                secondResultId: secondResult?.session?.id || null,
                activeSessionId: orchestrator._activeSessionId,
            };
        });

        expect(result.prepareCalls).toBe(2);
        expect(result.wired).toEqual(['second-session']);
        expect(result.applied).toEqual(['second-session']);
        expect(result.disposed).toEqual([{
            id: 'first-session',
            reason: 'stale_session_init',
            clearScene: true,
        }]);
        expect(result.firstResultIsNull).toBeTruthy();
        expect(result.secondResultId).toBe('second-session');
        expect(typeof result.activeSessionId).toBe('string');
    });
});
