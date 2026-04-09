import {
    test,
    expect,
    CONFIG,
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
    createMapDocument,
    parseMapJSON,
    stringifyMapDocument,
    toArenaMapDefinition,
    generateJSONExport,
    importFromJSON,
    RoundMetricsStore,
    getVehicleManagerInteractionRules,
    listVehicleManagerCatalogEntries,
    resolveVehicleManagerCatalogEntry,
    applyPlayerPowerup,
    updatePlayerEffects,
    SETTINGS_STORAGE_KEY,
    SETTINGS_PROFILES_STORAGE_KEY,
    LEGACY_SETTINGS_STORAGE_KEY,
    MENU_DRAFTS_STORAGE_KEY,
    MENU_PRESETS_STORAGE_KEY,
    CUSTOM_MAP_STORAGE_KEY,
    ARCADE_VEHICLE_PROFILE_STORAGE_KEY,
    ARCADE_VEHICLE_LOADOUT_STORAGE_KEY,
    ARCADE_LAST_RUN_STORAGE_KEY,
    buildLegacyRuntimeCustomMap,
    createMockEditorManager,
    loadGameWithRetry,
} from './core-targeted.shared.js';

test.describe('T1-20: Core & Infrastruktur - Plattform, Lifecycle & Multiplayer', () => {
    test.describe.configure({ mode: 'serial' });

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
});
