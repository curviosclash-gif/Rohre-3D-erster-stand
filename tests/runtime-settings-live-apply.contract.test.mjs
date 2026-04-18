import assert from 'node:assert/strict';
import test from 'node:test';

import { registerSessionMenuEventHandlers } from '../src/core/runtime/menu-handlers/SessionMenuEventHandlers.js';
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
