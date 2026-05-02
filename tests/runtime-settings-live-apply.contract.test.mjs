import assert from 'node:assert/strict';
import test from 'node:test';

import { ArcadeRunRuntime } from '../src/core/arcade/ArcadeRunRuntime.js';
import { ARCADE_GHOST_LIBRARY_STORAGE_KEY } from '../src/state/arcade/ArcadeGhostLibrary.js';
import { getRuntimeMapCatalog } from '../src/shared/contracts/RuntimeMapCatalogContract.js';
import { registerSessionMenuEventHandlers } from '../src/core/runtime/menu-handlers/SessionMenuEventHandlers.js';
import { createRuntimeConfigSnapshot } from '../src/core/RuntimeConfig.js';
import { createDefaultSettingsSnapshotForRuntime } from '../src/core/settings/SettingsDefaultsFacade.js';
import {
    createSettingsOverrideDraft,
    validateSettingsOverrideDraft,
} from '../src/core/settings/SettingsOverrideContract.js';
import { EntityManager } from '../src/entities/EntityManager.js';
import { MENU_CONTROLLER_EVENT_TYPES } from '../src/shared/contracts/MenuControllerContract.js';

function createEntityRuntimeConfigFixture(overrides = {}) {
    return {
        PLAYER: {
            SPEED: 21,
            TURN_SPEED: 2.4,
            ROLL_SPEED: 2.1,
            MODEL_SCALE: 1.05,
            ...(overrides.PLAYER || {}),
        },
        POWERUP: {
            TYPES: {
                BOOST: {},
                SHIELD: {},
            },
            ...(overrides.POWERUP || {}),
        },
        HUNT: {
            PLAYER_MAX_HP: 100,
            ...(overrides.HUNT || {}),
        },
        ...(overrides || {}),
    };
}

test('Session menu handler forwards LEVEL4_OPEN payload to facade', () => {
    const calls = [];
    const facade = {
        onSettingsChanged() {},
        handleSessionTypeChange() {},
        handleModePathChange() {},
        handleQuickStartLastStart() {},
        handleQuickStartEventPlaylistStart() {},
        handleQuickStartRandomStart() {},
        handleLevel3Reset() {},
        handleLevel4Open(event) {
            calls.push(event);
        },
        handleLevel4Close() {},
        handleLevel4Reset() {},
        handleConfigExportCode() {},
        handleConfigExportJson() {},
        handleConfigImport() {},
        startMatch() {},
    };
    const registry = new Map();
    const event = { sectionId: 'gameplay-combat' };

    registerSessionMenuEventHandlers(facade, registry);
    registry.get(MENU_CONTROLLER_EVENT_TYPES.LEVEL4_OPEN)?.(event);

    assert.deepEqual(calls, [event]);
});

test('EntityManager live runtime apply propagates updated config to runtime caches and players', () => {
    const previousErc = createEntityRuntimeConfigFixture({
        PLAYER: { SPEED: 12, TURN_SPEED: 1.5, ROLL_SPEED: 1.2, MODEL_SCALE: 0.9 },
        HUNT: { PLAYER_MAX_HP: 220 },
    });
    const nextErc = createEntityRuntimeConfigFixture({
        PLAYER: { SPEED: 33, TURN_SPEED: 2.8, ROLL_SPEED: 2.3, MODEL_SCALE: 1.2 },
        POWERUP: {
            TYPES: {
                BOOST: {},
                SHIELD: {},
                ROCKET_MEGA: {},
            },
        },
        HUNT: { PLAYER_MAX_HP: 100 },
    });
    const runtimeConfig = { gameplay: { fireRate: 0.7 } };

    const directRuntimeContext = {
        services: {
            entityRuntimeConfig: previousErc,
        },
    };
    const supportRuntimeContext = {
        services: {
            entityRuntimeConfig: previousErc,
        },
    };
    const projectileSystem = {
        entityRuntimeConfig: previousErc,
    };
    const powerupManager = {
        entityRuntimeConfig: previousErc,
        runtimeConfig: null,
        typeKeys: ['BOOST', 'SHIELD'],
    };
    const strategy = {
        entityRuntimeConfig: previousErc,
    };
    const arena = {
        entityRuntimeConfig: previousErc,
        runtimeConfig: null,
    };
    const controlOptionCalls = [];
    const players = [{
        entityRuntimeConfig: previousErc,
        maxHp: 190,
        hp: 145,
        setControlOptions(options) {
            controlOptionCalls.push(options);
        },
    }];

    const managerLike = {
        entityRuntimeConfig: previousErc,
        runtime: {
            context: directRuntimeContext,
            support: {
                runtimeContext: supportRuntimeContext,
            },
            systems: {
                projectileSystem,
            },
        },
        _runtimeContext: directRuntimeContext,
        _projectileSystem: projectileSystem,
        powerupManager,
        gameModeStrategy: strategy,
        arena,
        runtimeConfig: null,
        players,
    };

    EntityManager.prototype.applyLiveRuntimeConfig.call(managerLike, nextErc, runtimeConfig);

    assert.equal(managerLike.entityRuntimeConfig, nextErc);
    assert.equal(managerLike.runtimeConfig, runtimeConfig);
    assert.equal(arena.entityRuntimeConfig, nextErc);
    assert.equal(arena.runtimeConfig, runtimeConfig);

    assert.equal(directRuntimeContext.services.entityRuntimeConfig, nextErc);
    assert.equal(supportRuntimeContext.services.entityRuntimeConfig, nextErc);
    assert.equal(projectileSystem.entityRuntimeConfig, nextErc);
    assert.equal(powerupManager.entityRuntimeConfig, nextErc);
    assert.equal(powerupManager.runtimeConfig, runtimeConfig);
    assert.deepEqual(powerupManager.typeKeys, ['BOOST', 'SHIELD', 'ROCKET_MEGA']);
    assert.equal(strategy.entityRuntimeConfig, nextErc);

    assert.equal(players[0].entityRuntimeConfig, nextErc);
    assert.deepEqual(controlOptionCalls, [{
        speed: 33,
        turnSpeed: 2.8,
        rollSpeed: 2.3,
        modelScale: 1.2,
    }]);
    assert.equal(players[0].gameplayConfig?.PLAYER, nextErc.PLAYER);
    assert.equal(players[0].maxHp, 100);
    assert.equal(players[0].hp, 100);
});

test('Settings override validation reports explicit limit-rule errors only once per path/code', () => {
    const draft = createSettingsOverrideDraft();
    draft.limitOverrides = {
        'baseSettings.gameplay.speed': {
            min: 0,
            max: 10,
            step: -1,
        },
    };
    draft.baseSettings.gameplay.speed = 15;

    const result = validateSettingsOverrideDraft(draft);
    assert.equal(result.valid, false);

    const duplicateKey = result.errors.filter((entry) => (
        entry.path === 'baseSettings.gameplay.speed'
        && entry.code === 'LIMIT_STEP_NON_POSITIVE'
    ));
    assert.equal(duplicateKey.length, 1);
    assert(result.errors.some((entry) => (
        entry.path === 'baseSettings.gameplay.speed'
        && entry.code === 'FIELD_NUMBER_ABOVE_MAX'
    )));
});

test('V95 Runtime-Integration: override baseSettings merges into defaults and limitOverrides clamp runtime values', () => {
    const previousCurviosApp = globalThis.curviosApp;
    const previousSettingsDefaultsContract = globalThis.settingsDefaultsContract;
    globalThis.curviosApp = {
        settingsDefaults: {
            getOverrideSnapshot: () => ({
                draft: {
                    schemaVersion: 'menu-defaults-override.v1',
                    baseSettings: { gameplay: { itemAmount: 5 } },
                    limitOverrides: {
                        'baseSettings.gameplay.itemAmount': {
                            min: 1,
                            max: 5,
                            step: 1,
                            integer: true,
                        },
                    },
                },
            }),
        },
    };
    globalThis.settingsDefaultsContract = globalThis.curviosApp.settingsDefaults;
    try {
        const defaults = createDefaultSettingsSnapshotForRuntime();
        assert.equal(defaults.gameplay.itemAmount, 5);
        assert.equal(defaults.__overrideSkipped, undefined);

        const snapshot = createRuntimeConfigSnapshot({ gameplay: { itemAmount: 12 } });
        assert.equal(snapshot.powerup.maxOnField, 5);
    } finally {
        if (previousCurviosApp === undefined) {
            delete globalThis.curviosApp;
        } else {
            globalThis.curviosApp = previousCurviosApp;
        }
        if (previousSettingsDefaultsContract === undefined) {
            delete globalThis.settingsDefaultsContract;
        } else {
            globalThis.settingsDefaultsContract = previousSettingsDefaultsContract;
        }
    }
});

test('V95 Runtime-Integration: missing curviosApp global leaves code-defaults untouched', () => {
    const previousCurviosApp = globalThis.curviosApp;
    const previousSettingsDefaultsContract = globalThis.settingsDefaultsContract;
    delete globalThis.curviosApp;
    delete globalThis.settingsDefaultsContract;
    try {
        const defaults = createDefaultSettingsSnapshotForRuntime();
        assert.equal(defaults.__overrideSkipped, undefined);
        assert.equal(typeof defaults.gameplay.itemAmount, 'number');
    } finally {
        if (previousCurviosApp !== undefined) {
            globalThis.curviosApp = previousCurviosApp;
        }
        if (previousSettingsDefaultsContract !== undefined) {
            globalThis.settingsDefaultsContract = previousSettingsDefaultsContract;
        }
    }
});

test('Arcade ghost duel mode stays enabled for all single mode paths', () => {
    const normalSnapshot = createRuntimeConfigSnapshot({
        localSettings: {
            sessionType: 'single',
            modePath: 'normal',
            startSetup: { arcadeGhostDuelMode: 'self_longest_ghost' },
        },
    });
    assert.equal(normalSnapshot.arcade.ghostDuelMode, 'self_longest_ghost');

    const fightSnapshot = createRuntimeConfigSnapshot({
        localSettings: {
            sessionType: 'single',
            modePath: 'fight',
            startSetup: { arcadeGhostDuelMode: 'self_longest_ghost' },
        },
    });
    assert.equal(fightSnapshot.arcade.ghostDuelMode, 'self_longest_ghost');

    const multiplayerSnapshot = createRuntimeConfigSnapshot({
        localSettings: {
            sessionType: 'multiplayer',
            modePath: 'arcade',
            startSetup: { arcadeGhostDuelMode: 'self_longest_ghost' },
        },
    });
    assert.equal(multiplayerSnapshot.arcade.ghostDuelMode, 'off');
});

test('Arcade deriveRoundEndPlan routes PARCOURS_COMPLETE through completeParcoursSector', () => {
    const runtime = new ArcadeRunRuntime();
    runtime._enabled = true;
    runtime._state = { placeholder: true };

    const calls = [];
    runtime.completeParcoursSector = (parcoursResult = {}, options = {}) => {
        calls.push({ parcoursResult, options });
        return {
            outcome: {
                state: 'ROUND_END',
                reason: 'PARCOURS_COMPLETE',
                parcours: parcoursResult?.parcours || null,
                requiredWins: Math.max(1, Number(options?.winsNeeded) || 1),
            },
            transition: {
                nextState: 'ROUND_END',
                roundPause: 3,
            },
        };
    };

    const baseController = {
        defaultRoundPause: 3,
        deriveOnRoundEndPlan() {
            return null;
        },
    };
    const parcours = { completionTimeMs: 1234 };
    const plan = runtime.deriveRoundEndPlan({
        players: [],
        inputs: {
            reason: 'PARCOURS_COMPLETE',
            parcours,
            winsNeeded: 4,
        },
        baseController,
    });

    assert.equal(calls.length, 1);
    assert.deepEqual(calls[0].parcoursResult.parcours, parcours);
    assert.equal(calls[0].options.winsNeeded, 4);
    assert.equal(plan?.outcome?.reason, 'PARCOURS_COMPLETE');
    assert.equal(plan?.outcome?.requiredWins, 4);
    assert.deepEqual(plan?.outcome?.parcours, parcours);
});

test('Arcade parcours wrong-order event exposes red penalty HUD payload as one-shot', () => {
    const runtime = new ArcadeRunRuntime();
    runtime._enabled = true;
    runtime._state = {};

    const result = runtime.applyParcoursLeaderboardEvent({
        type: 'wrong_order',
        penaltyMs: 2000,
        totalPenaltyMs: 4000,
    });

    assert.deepEqual(result, { penaltyMs: 2000, totalPenaltyMs: 4000 });
    const firstHudState = runtime.getHudState();
    assert.deepEqual(firstHudState?.parcoursPenalty, { penaltyMs: 2000, totalPenaltyMs: 4000 });
    const secondHudState = runtime.getHudState();
    assert.equal(secondHudState?.parcoursPenalty, null);
});

test('Arcade parcours leaderboard persists penaltyTimeMs separately from totalTimeMs', () => {
    const writes = [];
    const runtime = new ArcadeRunRuntime();
    runtime._enabled = true;
    runtime._state = {};
    runtime._leaderboard = {};
    runtime.settingsManager = {
        store: {
            saveJsonRecord(key, value) {
                writes.push({ key, value });
            },
        },
    };

    const result = runtime.applyParcoursLeaderboardEvent({
        type: 'finish',
        playerIndex: 0,
        routeId: 'unit_route',
        totalTimeMs: 3210,
        penaltyTimeMs: 2000,
        segmentSplitsMs: [900, 1800, 2700],
        ghostClip: null,
    });

    assert.equal(result?.inserted, true);
    const lastWrite = writes[writes.length - 1];
    assert.equal(lastWrite?.key, 'cuviosclash.parcours-leaderboard.v1');
    assert.equal(lastWrite?.value?.unit_route?.[0]?.totalTimeMs, 3210);
    assert.equal(lastWrite?.value?.unit_route?.[0]?.penaltyTimeMs, 2000);
});

test('Arcade ghost_start replays only in self_longest_ghost mode and uses longest route ghost', () => {
    const runtime = new ArcadeRunRuntime();
    runtime._enabled = true;
    runtime._config = { ghostDuelMode: 'self_longest_ghost' };
    runtime._state = {};
    const ghostClip = {
        frames: [{ time: 0, players: [{ idx: 0 }] }, { time: 3.4, players: [{ idx: 0 }] }],
        players: [{ idx: 0, color: 0xffffff }],
        sourceDuration: 3.4,
        displayDuration: 3.4,
    };
    runtime._ghostLibrary = {
        route_alpha: {
            routeId: 'route_alpha',
            longestGhostClip: ghostClip,
            durationMs: 3400,
            updatedAt: '2026-05-01T10:00:00.000Z',
        },
    };

    const playedClips = [];
    runtime.setGhostPlaybackHandler((clip) => {
        playedClips.push(clip);
    });

    runtime.applyParcoursLeaderboardEvent({
        type: 'ghost_start',
        routeId: 'route_alpha',
    });
    assert.equal(playedClips.length, 1);
    assert.equal(playedClips[0]?.frames?.length, 2);

    runtime.applyParcoursLeaderboardEvent({
        type: 'ghost_start',
        routeId: 'route_unknown',
        routeAliases: ['map_unknown', 'route_alpha'],
    });
    assert.equal(playedClips.length, 2);
    assert.equal(playedClips[1]?.frames?.length, 2);

    runtime._config.ghostDuelMode = 'off';
    runtime.applyParcoursLeaderboardEvent({
        type: 'ghost_start',
        routeId: 'route_alpha',
    });
    assert.equal(playedClips.length, 2);
});

test('Ghost duel playback remains available for single non-arcade runs', () => {
    const runtime = new ArcadeRunRuntime();
    runtime._enabled = false;
    runtime._config = { ghostDuelMode: 'self_longest_ghost' };
    runtime._state = null;
    runtime._ghostLibrary = {
        map_maze: {
            routeId: 'map_maze',
            longestGhostClip: {
                frames: [{ time: 0, players: [{ idx: 0 }] }, { time: 5.1, players: [{ idx: 0 }] }],
                players: [{ idx: 0 }],
                sourceDuration: 5.1,
                displayDuration: 5.1,
            },
            durationMs: 5100,
            updatedAt: '2026-05-01T10:00:00.000Z',
        },
    };

    const playedClips = [];
    runtime.setGhostPlaybackHandler((clip) => {
        playedClips.push(clip);
    });

    runtime.applyParcoursLeaderboardEvent({
        type: 'ghost_start',
        routeId: 'map_maze',
    });

    assert.equal(playedClips.length, 1);
    assert.equal(playedClips[0]?.sourceDuration, 5.1);
});

test('Ghost duel route aliases resolve playback across all runtime maps', () => {
    const runtime = new ArcadeRunRuntime();
    runtime._enabled = false;
    runtime._config = { ghostDuelMode: 'self_longest_ghost' };
    runtime._state = null;
    runtime._leaderboard = {};
    runtime._ghostLibrary = {};
    runtime.settingsManager = {
        store: {
            saveJsonRecord() {},
        },
    };
    const maps = getRuntimeMapCatalog();
    const mapEntries = Object.entries(maps || {});
    const clip = {
        frames: [{ time: 0, players: [{ idx: 0 }] }, { time: 4.2, players: [{ idx: 0 }] }],
        players: [{ idx: 0 }],
        sourceDuration: 4.2,
        displayDuration: 4.2,
    };

    for (let i = 0; i < mapEntries.length; i += 1) {
        const [mapKey, mapDefinition] = mapEntries[i];
        const routeId = String(mapDefinition?.parcours?.routeId || '').trim();
        const primaryRouteId = routeId || mapKey;
        const aliases = routeId ? [mapKey] : [];
        runtime.applyParcoursLeaderboardEvent({
            type: 'finish',
            routeId: primaryRouteId,
            routeAliases: aliases,
            totalTimeMs: 4200,
            penaltyTimeMs: 0,
            segmentSplitsMs: [],
            ghostClip: clip,
            persistLibraryOnly: true,
        });

        let playbackCount = 0;
        runtime.setGhostPlaybackHandler(() => {
            playbackCount += 1;
        });
        runtime.applyParcoursLeaderboardEvent({
            type: 'ghost_start',
            routeId: mapKey,
            routeAliases: routeId ? [routeId] : [],
        });
        assert.equal(
            playbackCount,
            1,
            `Ghost playback alias lookup failed for map "${mapKey}" (route "${primaryRouteId}")`
        );
    }
});

test('Ghost library can persist finish clips in non-arcade library-only mode', () => {
    const writes = [];
    const runtime = new ArcadeRunRuntime();
    runtime._enabled = false;
    runtime._config = { ghostDuelMode: 'self_longest_ghost' };
    runtime._state = null;
    runtime._leaderboard = {};
    runtime._ghostLibrary = {};
    runtime.settingsManager = {
        store: {
            saveJsonRecord(key, value) {
                writes.push({ key, value });
            },
        },
    };

    const result = runtime.applyParcoursLeaderboardEvent({
        type: 'finish',
        routeId: 'map_downtown',
        routeAliases: ['downtown_alias'],
        totalTimeMs: 6500,
        penaltyTimeMs: 0,
        segmentSplitsMs: [],
        ghostClip: {
            frames: [{ time: 0, players: [{ idx: 0 }] }, { time: 6.5, players: [{ idx: 0 }] }],
            players: [{ idx: 0 }],
            sourceDuration: 6.5,
            displayDuration: 6.5,
        },
        persistLibraryOnly: true,
    });

    assert.equal(result?.inserted, false);
    assert.equal(result?.persistLibraryOnly, true);
    assert.deepEqual(result?.ghostRouteIds, ['map_downtown', 'downtown_alias']);
    assert.equal(result?.longestGhostUpdated, true);
    assert.equal(runtime._ghostLibrary.map_downtown.durationMs, 6500);
    assert.equal(runtime._ghostLibrary.downtown_alias.durationMs, 6500);

    const leaderboardWrites = writes.filter((entry) => entry.key === 'cuviosclash.parcours-leaderboard.v1');
    const ghostLibraryWrites = writes.filter((entry) => entry.key === ARCADE_GHOST_LIBRARY_STORAGE_KEY);
    assert.equal(leaderboardWrites.length, 0);
    assert.equal(ghostLibraryWrites.length, 1);
    assert.equal(ghostLibraryWrites[0]?.value?.map_downtown?.durationMs, 6500);
    assert.equal(ghostLibraryWrites[0]?.value?.downtown_alias?.durationMs, 6500);
});

test('Arcade finish updates longest ghost library by durationMs and keeps shorter runs', () => {
    const writes = [];
    const runtime = new ArcadeRunRuntime();
    runtime._enabled = true;
    runtime._config = { ghostDuelMode: 'self_longest_ghost' };
    runtime._state = {};
    runtime._leaderboard = {};
    runtime._ghostLibrary = {};
    runtime._activeVehicleId = 'ship5';
    runtime.settingsManager = {
        store: {
            saveJsonRecord(key, value) {
                writes.push({ key, value });
            },
        },
    };

    const clipLong = {
        frames: [{ time: 0, players: [{ idx: 0 }] }, { time: 4.8, players: [{ idx: 0 }] }],
        players: [{ idx: 0 }],
        sourceDuration: 4.8,
        displayDuration: 4.8,
    };
    const clipShort = {
        frames: [{ time: 0, players: [{ idx: 0 }] }, { time: 2.9, players: [{ idx: 0 }] }],
        players: [{ idx: 0 }],
        sourceDuration: 2.9,
        displayDuration: 2.9,
    };

    const first = runtime.applyParcoursLeaderboardEvent({
        type: 'finish',
        routeId: 'route_alpha',
        totalTimeMs: 4800,
        penaltyTimeMs: 0,
        segmentSplitsMs: [1200, 2400, 3600],
        ghostClip: clipLong,
    });
    assert.equal(first?.longestGhostUpdated, true);
    assert.equal(runtime._ghostLibrary.route_alpha.durationMs, 4800);

    const second = runtime.applyParcoursLeaderboardEvent({
        type: 'finish',
        routeId: 'route_alpha',
        totalTimeMs: 2900,
        penaltyTimeMs: 0,
        segmentSplitsMs: [800, 1600, 2400],
        ghostClip: clipShort,
    });
    assert.equal(second?.longestGhostUpdated, false);
    assert.equal(second?.longestGhostReason, 'not_longer');
    assert.equal(runtime._ghostLibrary.route_alpha.durationMs, 4800);

    const third = runtime.applyParcoursLeaderboardEvent({
        type: 'finish',
        routeId: 'route_alpha',
        totalTimeMs: 5200,
        penaltyTimeMs: 0,
        segmentSplitsMs: [1300, 2600, 3900],
        ghostClip: clipLong,
    });
    assert.equal(third?.longestGhostUpdated, true);
    assert.equal(runtime._ghostLibrary.route_alpha.durationMs, 5200);

    const ghostLibraryWrites = writes.filter((entry) => entry.key === ARCADE_GHOST_LIBRARY_STORAGE_KEY);
    assert.equal(ghostLibraryWrites.length, 2);
    assert.equal(ghostLibraryWrites[1]?.value?.route_alpha?.durationMs, 5200);
});
