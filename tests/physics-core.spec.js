import { test, expect } from '@playwright/test';
import { loadGame, openGameSubmenu, startGame, startGameWithBots } from './helpers.js';
import { stringifyMapDocument } from '../src/entities/MapSchema.js';
import { TEST_HANGAR_GLB_DATA_URI } from '../src/core/config/maps/EmbeddedGlbMapAssets.js';

const CUSTOM_MAP_STORAGE_KEY = 'custom_map_test';

function buildAuthoredRuntimeShowcaseMap() {
    return stringifyMapDocument({
        arenaSize: { width: 390, height: 156, depth: 390 },
        glbModel: TEST_HANGAR_GLB_DATA_URI,
        glbColliderMode: 'fallbackOnly',
        preferAuthoredPortals: true,
        portalLevels: [36, 78, 120],
        hardBlocks: [
            { id: 'hard_lane_a', x: -108, y: 30, z: 0, width: 18, height: 60, depth: 132 },
            { id: 'hard_gate_lane', x: 0, y: 36, z: -102, width: 120, height: 54, depth: 18, tunnel: { radius: 14.4, axis: 'x' } },
        ],
        foamBlocks: [
            { id: 'foam_center', x: 0, y: 12, z: 0, width: 72, height: 24, depth: 72 },
            { id: 'foam_upper', x: 0, y: 84, z: 90, width: 108, height: 30, depth: 18, tunnel: { radius: 11.7, axis: 'x' } },
        ],
        tunnels: [
            { id: 'tube_lane', ax: -132, ay: 54, az: -78, bx: 132, by: 54, bz: -78, radius: 12.6 },
            { id: 'tube_lift', ax: 0, ay: 30, az: 132, bx: 0, by: 102, bz: 132, radius: 10.8 },
        ],
        portals: [
            { id: 'portal_a', x: -156, y: 36, z: -156, radius: 18 },
            { id: 'portal_b', x: 156, y: 78, z: 156, radius: 18 },
            { id: 'portal_c', x: 156, y: 36, z: -144, radius: 18 },
            { id: 'portal_d', x: -156, y: 120, z: 144, radius: 18 },
        ],
        gates: [
            { id: 'gate_boost', type: 'boost', pos: [0, 36, -150], forward: [0, 0, -1], params: { duration: 1.4, forwardImpulse: 46, bonusSpeed: 62 } },
            { id: 'gate_slingshot', type: 'slingshot', pos: [-144, 78, 0], forward: [1, 0, 0], up: [0, 1, 0], params: { duration: 1.8, forwardImpulse: 34, liftImpulse: 10 } },
        ],
        playerSpawn: { id: 'spawn_player', x: -162, y: 36, z: 54 },
        botSpawns: [
            { id: 'spawn_bot_a', x: 162, y: 36, z: 54 },
            { id: 'spawn_bot_b', x: 162, y: 78, z: -60 },
            { id: 'spawn_bot_c', x: -162, y: 120, z: -54 },
        ],
        items: [
            { id: 'item_speed', type: 'item_battery', pickupType: 'SPEED_UP', x: 0, y: 36, z: -36, weight: 2 },
            { id: 'item_rocket', type: 'item_rocket', pickupType: 'ROCKET_WEAK', x: 60, y: 78, z: 54, weight: 1 },
            { id: 'item_shield', type: 'item_shield', pickupType: 'SHIELD', x: -60, y: 120, z: 66, weight: 1.5 },
            { id: 'item_random', type: 'item_coin', x: 120, y: 36, z: -84, weight: 0.8 },
        ],
        aircraft: [
            { id: 'air_1', jetId: 'jet_ship3', x: -84, y: 102, z: -138, scale: 3.6, rotateY: 0.6 },
            { id: 'air_2', jetId: 'jet_ship6', x: 102, y: 60, z: 36, scale: 3.15, rotateY: -1.15 },
        ],
    });
}

test.describe('Physics Core (Tests 41-60)', () => {
    test.describe.configure({ timeout: 120000 });

    test('T41: Arena-Kollision erkennt Wand (außerhalb)', async ({ page }) => {
        await startGame(page);
        const hit = await page.evaluate(() => {
            const g = window.GAME_INSTANCE;
            if (!g?.arena?.checkCollision) return null;
            return g.arena.checkCollision({ x: 999, y: 999, z: 999 }, 0.5);
        });
        expect(hit).toBeTruthy();
    });

    test('T42: Arena-Kollision frei in Mitte', async ({ page }) => {
        await startGame(page);
        const hit = await page.evaluate(() => {
            const g = window.GAME_INSTANCE;
            if (!g?.arena?.checkCollision) return null;
            return g.arena.checkCollision({ x: 0, y: 50, z: 0 }, 0.3);
        });
        expect(!hit).toBeTruthy();
    });

    test('T43: Standard-Map hat Hindernisse', async ({ page }) => {
        await startGame(page);
        const count = await page.evaluate(() =>
            window.GAME_INSTANCE?.arena?.obstacles?.length ?? 0
        );
        expect(count).toBeGreaterThan(0);
    });

    test('T43b: Custom-Map nutzt authored Spawns, Tunnel, Pickup-Anker und Aircraft-Deko zur Laufzeit', async ({ page }) => {
        const mapJson = buildAuthoredRuntimeShowcaseMap();
        await loadGame(page);
        await openGameSubmenu(page);
        await page.evaluate(({ storageKey, runtimeMapJson }) => {
            localStorage.setItem(storageKey, runtimeMapJson);
            const slider = document.getElementById('bot-count');
            slider.value = '3';
            slider.dispatchEvent(new Event('input', { bubbles: true }));
            const game = window.GAME_INSTANCE;
            game.settings.mapKey = 'custom';
            game.runtimeFacade?.onSettingsChanged?.({ changedKeys: ['mapKey'] });
        }, {
            storageKey: CUSTOM_MAP_STORAGE_KEY,
            runtimeMapJson: mapJson,
        });
        await page.waitForFunction(() => window.GAME_INSTANCE?.settings?.mapKey === 'custom', null, { timeout: 5000 });

        const probe = await page.evaluate(async () => {
            const game = window.GAME_INSTANCE;
            game.runtimeFacade?._clearMatchPrewarmTimer?.();
            await game.matchFlowUiController.startMatch();

            const arena = game.arena;
            const powerupManager = game.powerupManager;
            const human = game.entityManager?.players?.find((player) => !player?.isBot) || null;
            const authoredPlayerSpawn = arena?.getAuthoredPlayerSpawn?.() || null;
            const authoredBotSpawns = arena?.getAuthoredBotSpawns?.() || [];
            const authoredItemAnchors = arena?.getAuthoredItemAnchors?.() || [];
            const distanceTo = (position, target) => Math.hypot(
                (position?.x || 0) - (target?.x || 0),
                (position?.y || 0) - (target?.y || 0),
                (position?.z || 0) - (target?.z || 0),
            );

            powerupManager.clear();
            powerupManager._spawnRandom();
            const spawnedItem = powerupManager.items[0] || null;
            const spawnedAnchorDistance = spawnedItem
                ? authoredItemAnchors.reduce((best, anchor) => Math.min(best, distanceTo(spawnedItem.mesh.position, anchor)), Number.POSITIVE_INFINITY)
                : null;
            powerupManager.clear();

            return {
                currentMapKey: arena?.currentMapKey || '',
                glbScenePresent: !!arena?._glbScene,
                glbError: arena?._glbLoadError || '',
                glbColliderMode: arena?.currentMapDefinition?.glbColliderMode || '',
                portalLevels: Array.isArray(arena?.currentMapDefinition?.portalLevels) ? arena.currentMapDefinition.portalLevels : [],
                portalCount: Array.isArray(arena?.portals) ? arena.portals.length : 0,
                gateTypes: Array.isArray(arena?.specialGates) ? arena.specialGates.map((gate) => gate.type) : [],
                tubeObstacleCount: Array.isArray(arena?.obstacles) ? arena.obstacles.filter((entry) => !!entry?.tube).length : 0,
                aircraftDecorationCount: Array.isArray(arena?._aircraftDecorations) ? arena._aircraftDecorations.length : 0,
                authoredItemAnchorCount: authoredItemAnchors.length,
                playerSpawnDistance: human && authoredPlayerSpawn ? distanceTo(human.position, authoredPlayerSpawn) : null,
                botSpawnDistances: Array.isArray(game.entityManager?.players)
                    ? game.entityManager.players
                        .filter((player) => player?.isBot)
                        .map((bot) => authoredBotSpawns.reduce((best, spawn) => Math.min(best, distanceTo(bot.position, spawn)), Number.POSITIVE_INFINITY))
                    : [],
                spawnedItemType: spawnedItem?.type || null,
                spawnedAnchorDistance,
            };
        });

        expect(probe.currentMapKey).toBe('custom');
        expect(probe.glbScenePresent).toBeTruthy();
        expect(probe.glbError).toBe('');
        expect(probe.glbColliderMode).toBe('fallbackOnly');
        expect(probe.portalLevels).toEqual([12, 26, 40]);
        expect(probe.portalCount).toBe(2);
        expect(probe.gateTypes).toEqual(expect.arrayContaining(['boost', 'slingshot']));
        expect(probe.tubeObstacleCount).toBe(2);
        expect(probe.aircraftDecorationCount).toBe(2);
        expect(probe.authoredItemAnchorCount).toBe(4);
        expect(probe.playerSpawnDistance).not.toBeNull();
        expect(probe.playerSpawnDistance).toBeLessThan(6);
        expect(probe.botSpawnDistances).toHaveLength(3);
        expect(probe.botSpawnDistances.every((distance) => distance < 8)).toBeTruthy();
        expect(probe.spawnedItemType).not.toBeNull();
        expect(probe.spawnedAnchorDistance).not.toBeNull();
        expect(probe.spawnedAnchorDistance).toBeLessThan(0.5);
    });

    test('T44: Spieler-Position ändert sich nach 1s', async ({ page }) => {
        await startGame(page);
        const moved = await page.evaluate(() =>
            new Promise(resolve => {
                const p = window.GAME_INSTANCE?.entityManager?.players?.[0];
                if (!p) return resolve(false);
                const start = { x: p.position.x, y: p.position.y, z: p.position.z };
                setTimeout(() => {
                    const dx = p.position.x - start.x;
                    const dy = p.position.y - start.y;
                    const dz = p.position.z - start.z;
                    resolve(Math.sqrt(dx * dx + dy * dy + dz * dz) > 0.01);
                }, 1000);
            })
        );
        expect(moved).toBeTruthy();
    });

    test('T45: Spieler hat Trail-Mesh nach 2s', async ({ page }) => {
        await startGame(page);
        await page.waitForTimeout(2000);
        const hasTrail = await page.evaluate(() => {
            const p = window.GAME_INSTANCE?.entityManager?.players?.[0];
            return (p?.trail?.mesh?.geometry?.attributes?.position?.count ?? 0) > 0;
        });
        expect(hasTrail).toBeTruthy();
    });

    test('T45b: PlayerLifecycleSystem aktualisiert den Trail ausserhalb von PlayerView.update', async ({ page }) => {
        await startGame(page);
        const result = await page.evaluate(() => {
            const game = window.GAME_INSTANCE;
            const entityManager = game?.entityManager;
            const player = entityManager?.players?.[0];
            if (!entityManager || !player?.view || !player?.trail) {
                return { error: 'missing-player-runtime' };
            }

            const originalViewUpdate = player.view.update.bind(player.view);
            const originalTrailUpdate = player.trail.update.bind(player.trail);
            let trailCalls = 0;
            let trailCalledFromView = false;
            let insideViewUpdate = false;

            player.view.update = (dt) => {
                insideViewUpdate = true;
                try {
                    return originalViewUpdate(dt);
                } finally {
                    insideViewUpdate = false;
                }
            };
            player.trail.update = (...args) => {
                trailCalls += 1;
                if (insideViewUpdate) {
                    trailCalledFromView = true;
                }
                return originalTrailUpdate(...args);
            };

            const input = {
                pitchUp: false,
                pitchDown: false,
                yawLeft: false,
                yawRight: false,
                rollLeft: false,
                rollRight: false,
                boost: false,
                cameraSwitch: false,
                dropItem: false,
                shootItem: false,
                shootMG: false,
                shootItemIndex: -1,
                nextItem: false,
                useItem: -1,
            };

            try {
                entityManager._playerLifecycleSystem.updatePlayer(player, 1 / 60, input);
                return {
                    error: null,
                    trailCalls,
                    trailCalledFromView,
                };
            } finally {
                player.view.update = originalViewUpdate;
                player.trail.update = originalTrailUpdate;
            }
        });

        expect(result.error).toBeNull();
        expect(result.trailCalls).toBe(1);
        expect(result.trailCalledFromView).toBeFalsy();
    });

    test('T45c: Boost laesst sich per Taste toggeln und laedt partiell nach', async ({ page }) => {
        await startGame(page);

        const boostKey = await page.evaluate(() => (
            window.GAME_INSTANCE?.settings?.controls?.PLAYER_1?.BOOST || 'ShiftLeft'
        ));

        const tapBoost = async () => {
            await page.evaluate((code) => {
                window.dispatchEvent(new KeyboardEvent('keydown', {
                    code,
                    bubbles: true,
                    cancelable: true,
                }));
                window.dispatchEvent(new KeyboardEvent('keyup', {
                    code,
                    bubbles: true,
                    cancelable: true,
                }));
            }, boostKey);
        };

        const before = await page.evaluate(() => {
            const player = window.GAME_INSTANCE?.entityManager?.players?.[0];
            return {
                boostCharge: Number(player?.boostCharge ?? NaN),
                boostCapacity: Number(window.GAME_INSTANCE?.config?.PLAYER?.BOOST_DURATION ?? NaN),
            };
        });

        await tapBoost();
        await page.waitForTimeout(250);

        const during = await page.evaluate(() => {
            const player = window.GAME_INSTANCE?.entityManager?.players?.[0];
            return {
                boostCharge: Number(player?.boostCharge ?? NaN),
                manualBoostActive: !!player?.manualBoostActive,
                isBoosting: !!player?.isBoosting,
                speed: Number(player?.speed ?? NaN),
                baseSpeed: Number(player?.baseSpeed ?? NaN),
            };
        });

        await tapBoost();
        await page.waitForTimeout(120);

        const afterToggleOff = await page.evaluate(() => {
            const player = window.GAME_INSTANCE?.entityManager?.players?.[0];
            return {
                boostCharge: Number(player?.boostCharge ?? NaN),
                manualBoostActive: !!player?.manualBoostActive,
                isBoosting: !!player?.isBoosting,
            };
        });

        await page.waitForTimeout(700);

        const afterRecharge = await page.evaluate(() => {
            const player = window.GAME_INSTANCE?.entityManager?.players?.[0];
            return {
                boostCharge: Number(player?.boostCharge ?? NaN),
                manualBoostActive: !!player?.manualBoostActive,
            };
        });

        expect(before.boostCapacity).toBeCloseTo(4, 5);
        expect(before.boostCharge).toBeCloseTo(before.boostCapacity, 5);
        expect(during.manualBoostActive).toBeTruthy();
        expect(during.isBoosting).toBeTruthy();
        expect(during.speed).toBeGreaterThan(during.baseSpeed);
        expect(during.boostCharge).toBeLessThan(before.boostCharge);
        expect(during.boostCharge).toBeGreaterThan(0);
        expect(afterToggleOff.manualBoostActive).toBeFalsy();
        expect(afterToggleOff.isBoosting).toBeFalsy();
        expect(afterToggleOff.boostCharge).toBeGreaterThan(0);
        expect(afterToggleOff.boostCharge).toBeLessThan(before.boostCapacity);
        expect(afterRecharge.manualBoostActive).toBeFalsy();
        expect(afterRecharge.boostCharge).toBeGreaterThan(afterToggleOff.boostCharge);
        expect(afterRecharge.boostCharge).toBeLessThanOrEqual(before.boostCapacity);
    });

    test('T46: 1 Bot spawnt korrekt', async ({ page }) => {
        test.setTimeout(60000);
        await startGameWithBots(page, 1);
        const bots = await page.evaluate(() =>
            window.GAME_INSTANCE?.entityManager?.players?.filter(p => p.isBot).length ?? 0
        );
        expect(bots).toBe(1);
    });

    test('T47: EASY bot hat höhere reactionTime als HARD', async ({ page }) => {
        await loadGame(page);
        const result = await page.evaluate(() => {
            const cfg = window.GAME_INSTANCE?.config || window.GAME_INSTANCE?.CONFIG;
            const profiles = cfg?.BOT?.DIFFICULTY_PROFILES;
            if (!profiles) return null;
            return {
                easy: profiles.EASY?.reactionTime,
                hard: profiles.HARD?.reactionTime,
            };
        });
        expect(result).not.toBeNull();
        expect(result.easy).toBeGreaterThan(result.hard);
    });

    test('T48: 4 Bots spawnen korrekt (5 Spieler gesamt)', async ({ page }) => {
        await startGameWithBots(page, 4);
        const total = await page.evaluate(() =>
            window.GAME_INSTANCE?.entityManager?.players?.length ?? 0
        );
        expect(total).toBe(5); // 1 Human + 4 Bots
    });

    test('T49: Spieler ist initial lebendig', async ({ page }) => {
        await startGame(page);
        const alive = await page.evaluate(() =>
            window.GAME_INSTANCE?.entityManager?.players?.[0]?.alive === true
        );
        expect(alive).toBeTruthy();
    });

    test('T50: Spieler beginnt mit Score 0', async ({ page }) => {
        await startGame(page);
        const score = await page.evaluate(() =>
            window.GAME_INSTANCE?.entityManager?.players?.[0]?.score
        );
        expect(score).toBe(0);
    });

    test('T51: Bot erkennt Hindernis via Raycast (_scanProbeRay)', async ({ page }) => {
        await startGameWithBots(page, 1);
        const wallDetected = await page.evaluate(() => {
            const resolveBotAI = (entry) => (
                entry?.ai?._botAI
                || entry?.ai?._fallbackPolicy?._botAI
                || entry?.ai?._fallbackPolicy?._fallbackPolicy?._botAI
                || null
            );
            const botData = window.GAME_INSTANCE?.entityManager?.bots?.[0];
            const botAI = resolveBotAI(botData);
            if (!botData || !botAI) return false;
            const bot = botData.player;

            const arena = window.GAME_INSTANCE.arena;
            const allPlayers = window.GAME_INSTANCE.entityManager.players;
            const probe = botAI._probes[0]; // Forward

            bot.position.set(0, arena.bounds.maxY - 1, 0);
            botAI._scoreProbe(bot, arena, allPlayers, probe, 10);
            return probe.wallDist < 10 && probe.immediateDanger === true;
        });
        expect(wallDetected).toBeTruthy();
    });

    test('T52: Bot Target Selection wählt nächsten Gegner', async ({ page }) => {
        await startGameWithBots(page, 2);
        const targetSelected = await page.evaluate(() => {
            const resolveBotAI = (entry) => (
                entry?.ai?._botAI
                || entry?.ai?._fallbackPolicy?._botAI
                || entry?.ai?._fallbackPolicy?._fallbackPolicy?._botAI
                || null
            );
            const botData = window.GAME_INSTANCE?.entityManager?.bots?.[0];
            const botAI = resolveBotAI(botData);
            if (!botData || !botAI) return false;
            const bot = botData.player;

            botAI._selectTarget(bot, window.GAME_INSTANCE.entityManager.players);
            return botAI.state.targetPlayer !== null && botAI.state.targetPlayer !== bot;
        });
        expect(targetSelected).toBeTruthy();
    });

    test('T53: Bot StuckScore steigt bei Blockade', async ({ page }) => {
        await startGameWithBots(page, 1);
        const stuckDetected = await page.evaluate(() => {
            const resolveBotAI = (entry) => (
                entry?.ai?._botAI
                || entry?.ai?._fallbackPolicy?._botAI
                || entry?.ai?._fallbackPolicy?._fallbackPolicy?._botAI
                || null
            );
            const botData = window.GAME_INSTANCE?.entityManager?.bots?.[0];
            const botAI = resolveBotAI(botData);
            if (!botData || !botAI) return false;
            const bot = botData.player;

            const arena = window.GAME_INSTANCE.arena;
            const allPlayers = window.GAME_INSTANCE.entityManager.players;

            botAI._checkStuckTimer = 0;
            botAI._updateStuckState(bot, arena, allPlayers);
            botAI._checkStuckTimer = 0;
            botAI._updateStuckState(bot, arena, allPlayers);

            return botAI._stuckScore > 0;
        });
        expect(stuckDetected).toBeTruthy();
    });

    test('T54: Bot MapBehavior liest korrektes Profil', async ({ page }) => {
        await startGameWithBots(page, 1);
        const hasBehavior = await page.evaluate(() => {
            const resolveBotAI = (entry) => (
                entry?.ai?._botAI
                || entry?.ai?._fallbackPolicy?._botAI
                || entry?.ai?._fallbackPolicy?._fallbackPolicy?._botAI
                || null
            );
            const botData = window.GAME_INSTANCE?.entityManager?.bots?.[0];
            const botAI = resolveBotAI(botData);
            if (!botData || !botAI) return false;

            const beh = botAI._mapBehavior(window.GAME_INSTANCE.arena);
            return typeof beh.caution === 'number' && typeof beh.aggressionBias === 'number';
        });
        expect(hasBehavior).toBeTruthy();
    });

    test('T55: Bot Direction updates correctly via steering inputs', async ({ page }) => {
        await startGameWithBots(page, 1);
        const moved = await page.evaluate(() => {
            const botData = window.GAME_INSTANCE?.entityManager?.bots?.[0];
            if (!botData) return false;
            const p = botData.player;
            const initialDir = p.position.clone().set(0, 0, 0);
            p.getDirection(initialDir);
            p.update(0.16, { yawRight: true }); // Apply steering
            const newDir = p.position.clone().set(0, 0, 0);
            p.getDirection(newDir);
            return initialDir.distanceTo(newDir) > 0.01;
        });
        expect(moved).toBeTruthy();
    });

    test('T55b: PlayerController nutzt standardmaessig direkten Legacy-Pfad fuer Human und Bot', async ({ page }) => {
        await startGameWithBots(page, 1);
        const probe = await page.evaluate(() => {
            const game = window.GAME_INSTANCE;
            const human = game?.entityManager?.players?.find((entry) => !entry?.isBot) || null;
            const bot = game?.entityManager?.bots?.[0]?.player || null;
            if (!human || !bot) {
                return { error: 'missing-players' };
            }

            const input = {
                pitchUp: false,
                pitchDown: false,
                yawLeft: false,
                yawRight: true,
                rollLeft: false,
                rollRight: false,
                boost: false,
            };

            human.controller.resetAxisState();
            bot.controller.resetAxisState();
            human.controlRampEnabled = false;
            bot.controlRampEnabled = false;

            const humanState = human.controller.resolveControlState(human, input, false, 1 / 60);
            const botState = bot.controller.resolveControlState(bot, input, false, 1 / 60);
            return {
                error: null,
                humanYaw: Number(humanState?.yawInput || 0),
                botYaw: Number(botState?.yawInput || 0),
            };
        });

        expect(probe.error).toBeNull();
        expect(probe.humanYaw).toBe(-1);
        expect(probe.botYaw).toBe(-1);
    });

    test('T56: Bot Probes scale correctly (12 probes pro AI)', async ({ page }) => {
        await startGameWithBots(page, 1);
        const probeCount = await page.evaluate(() => {
            const resolveBotAI = (entry) => (
                entry?.ai?._botAI
                || entry?.ai?._fallbackPolicy?._botAI
                || entry?.ai?._fallbackPolicy?._fallbackPolicy?._botAI
                || null
            );
            const botData = window.GAME_INSTANCE?.entityManager?.bots?.[0];
            const botAI = resolveBotAI(botData);
            return botAI?._probes?.length ?? 0;
        });
        expect(probeCount).toBe(12);
    });

    test('T57: Bot _estimateEnemyPressure detects nearby players', async ({ page }) => {
        await startGameWithBots(page, 1);
        const pressure = await page.evaluate(() => {
            const resolveBotAI = (entry) => (
                entry?.ai?._botAI
                || entry?.ai?._fallbackPolicy?._botAI
                || entry?.ai?._fallbackPolicy?._fallbackPolicy?._botAI
                || null
            );
            const botData = window.GAME_INSTANCE?.entityManager?.bots?.[0];
            const botAI = resolveBotAI(botData);
            if (!botData || !botAI) return 0;
            const bot = botData.player;
            const allPlayers = window.GAME_INSTANCE.entityManager.players;

            // Move human player close to bot
            allPlayers[0].position.copy(bot.position);
            allPlayers[0].position.x += 5;

            return botAI._estimateEnemyPressure(bot.position, bot, allPlayers);
        });
        expect(pressure).toBeGreaterThan(0.5);
    });

    test('T58: Bot FSM Transition to Recovery State', async ({ page }) => {
        await startGameWithBots(page, 1);
        const inRecovery = await page.evaluate(() => {
            const resolveBotAI = (entry) => (
                entry?.ai?._botAI
                || entry?.ai?._fallbackPolicy?._botAI
                || entry?.ai?._fallbackPolicy?._fallbackPolicy?._botAI
                || null
            );
            const botData = window.GAME_INSTANCE?.entityManager?.bots?.[0];
            const botAI = resolveBotAI(botData);
            if (!botData || !botAI) return false;
            const bot = botData.player;
            const arena = window.GAME_INSTANCE.arena;
            const allPlayers = window.GAME_INSTANCE.entityManager.players;

            botAI._enterRecovery(bot, arena, allPlayers, 'test');
            return botAI.state.recoveryActive && botAI.state.recoveryTimer > 0;
        });
        expect(inRecovery).toBeTruthy();
    });

    test('T59: Bot Recovery Switch Fallback', async ({ page }) => {
        await startGameWithBots(page, 1);
        const switchUsed = await page.evaluate(() => {
            const resolveBotAI = (entry) => (
                entry?.ai?._botAI
                || entry?.ai?._fallbackPolicy?._botAI
                || entry?.ai?._fallbackPolicy?._fallbackPolicy?._botAI
                || null
            );
            const botData = window.GAME_INSTANCE?.entityManager?.bots?.[0];
            const botAI = resolveBotAI(botData);
            if (!botData || !botAI) return false;
            const bot = botData.player;
            const arena = window.GAME_INSTANCE.arena;
            const allPlayers = window.GAME_INSTANCE.entityManager.players;

            botAI._enterRecovery(bot, arena, allPlayers, 'test');
            botAI.sense.forwardRisk = 1.0;
            botAI.state.recoveryTimer = 0.1; // Simulate close to ending
            botAI._updateRecovery(0.016, bot, arena, allPlayers);
            return botAI.state.recoverySwitchUsed;
        });
        expect(switchUsed).toBeTruthy();
    });

    test('T60: Bot Target InFront Query (LoS)', async ({ page }) => {
        await startGameWithBots(page, 1);
        const targetInFront = await page.evaluate(() => {
            const resolveBotAI = (entry) => (
                entry?.ai?._botAI
                || entry?.ai?._fallbackPolicy?._botAI
                || entry?.ai?._fallbackPolicy?._fallbackPolicy?._botAI
                || null
            );
            const botData = window.GAME_INSTANCE?.entityManager?.bots?.[0];
            const botAI = resolveBotAI(botData);
            if (!botData || !botAI) return false;
            const bot = botData.player;
            const human = window.GAME_INSTANCE.entityManager.players[0];
            if (!human) return false;

            // Set human directly in front of bot
            const forward = bot.position.clone().set(0, 0, 0);
            bot.getDirection(forward);
            human.position.copy(bot.position).addScaledVector(forward, 10);

            botAI._selectTarget(bot, window.GAME_INSTANCE.entityManager.players);
            return botAI.sense.targetInFront;
        });
        expect(targetInFront).toBeTruthy();
    });

});
