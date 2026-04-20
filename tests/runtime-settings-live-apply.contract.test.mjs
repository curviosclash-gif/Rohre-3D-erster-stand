import assert from 'node:assert/strict';
import test from 'node:test';

import { ArcadeRunRuntime } from '../src/core/arcade/ArcadeRunRuntime.js';
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
    }
});

test('V95 Runtime-Integration: missing curviosApp global leaves code-defaults untouched', () => {
    const previousCurviosApp = globalThis.curviosApp;
    delete globalThis.curviosApp;
    try {
        const defaults = createDefaultSettingsSnapshotForRuntime();
        assert.equal(defaults.__overrideSkipped, undefined);
        assert.equal(typeof defaults.gameplay.itemAmount, 'number');
    } finally {
        if (previousCurviosApp !== undefined) {
            globalThis.curviosApp = previousCurviosApp;
        }
    }
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
