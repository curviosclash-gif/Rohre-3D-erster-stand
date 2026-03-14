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
import { stringifyMapDocument } from '../src/entities/MapSchema.js';

const SETTINGS_STORAGE_KEY = 'cuviosclash.settings.v1';
const SETTINGS_PROFILES_STORAGE_KEY = 'cuviosclash.settings-profiles.v1';
const LEGACY_SETTINGS_STORAGE_KEY = 'aero-arena-3d.settings.v1';
const MENU_PRESETS_STORAGE_KEY = 'cuviosclash.menu-presets.v1';
const CUSTOM_MAP_STORAGE_KEY = 'custom_map_test';
const GENERATED_LOCAL_MAPS_MODULE_PATH = path.resolve(process.cwd(), 'src/entities/GeneratedLocalMaps.js');
const EDITOR_MAP_DIR = path.resolve(process.cwd(), 'data/maps');
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
                mapKey: 'maze',
                winsNeeded: 7,
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

        expect(migratedState.mapKey).toBe('maze');
        expect(migratedState.winsNeeded).toBe(7);
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

        for (const mapKey of ['standard', 'empty', 'maze', 'complex', 'pyramid']) {
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
        await page.evaluate(() => {
            const button = document.querySelector('#submenu-game [data-preset-id="competitive"]');
            button?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        });
        await page.waitForTimeout(50);

        const matchPreset = await page.evaluate(() => ({
            id: window.GAME_INSTANCE?.settings?.matchSettings?.activePresetId || '',
            kind: window.GAME_INSTANCE?.settings?.matchSettings?.activePresetKind || '',
        }));

        expect(matchPreset.id).toBe('competitive');
        expect(matchPreset.kind).toBe('fixed');
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
        await openGameSubmenu(page);
        await page.selectOption('#map-select', 'complex');
        await openStartSetupSection(page, 'match');
        await page.selectOption('#theme-mode-select', 'hell');
        await page.click('#btn-level3-reset');
        expect(await page.inputValue('#map-select')).toBe('standard');
        expect(await page.inputValue('#theme-mode-select')).toBe('dunkel');

        await openLevel4Drawer(page, { section: 'gameplay' });
        await page.evaluate(() => {
            const slider = document.getElementById('speed-slider');
            if (!slider) return;
            slider.value = '30';
            slider.dispatchEvent(new Event('input', { bubbles: true }));
        });
        await page.click('#btn-level4-reset');
        await page.waitForTimeout(100);
        expect(await page.inputValue('#speed-slider')).toBe('18');
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
            recorder._finalizeBlobExport(new Blob(['clip'], { type: 'video/webm' }), 'video/webm');
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
                const payload = await response.json();
                return {
                    status: response.status,
                    ok: response.ok,
                    payload,
                };
            }, { mapName, mapJson });

            expect(saveResult.ok).toBeTruthy();
            expect(saveResult.payload?.ok).toBeTruthy();
            expect(saveResult.payload?.generatedModulePath).toBe('src/entities/GeneratedLocalMaps.js');

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
