import assert from 'node:assert/strict';
import test from 'node:test';

import {
    getRocketPickupTypes,
    isPickupTypeAllowedForMode,
    isPickupTypeSelfUsable,
    isPickupTypeShootable,
    normalizePickupType,
} from '../src/entities/PickupRegistry.js';
import { createMapDocument } from '../src/entities/MapSchema.js';
import { ClassicModeStrategy } from '../src/modes/ClassicModeStrategy.js';
import { HuntModeStrategy } from '../src/modes/HuntModeStrategy.js';
import { RoundMetricsStore } from '../src/state/recorder/RoundMetricsStore.js';

test('Pickup capability matrix keeps rocket and utility contracts mode-safe', () => {
    const rocketTypes = getRocketPickupTypes();
    assert.ok(rocketTypes.length >= 4);

    for (const type of rocketTypes) {
        assert.equal(isPickupTypeAllowedForMode(type, 'HUNT'), true);
        assert.equal(isPickupTypeAllowedForMode(type, 'CLASSIC'), false);
        assert.equal(isPickupTypeSelfUsable(type, 'HUNT'), false);
        assert.equal(isPickupTypeShootable(type, 'HUNT'), true);
    }

    assert.equal(normalizePickupType('item_rocket'), 'ROCKET_WEAK');
    assert.equal(isPickupTypeAllowedForMode('SLOW_TIME', 'CLASSIC'), true);
    assert.equal(isPickupTypeAllowedForMode('SLOW_TIME', 'HUNT'), false);
    assert.equal(isPickupTypeSelfUsable('SHIELD', 'HUNT'), true);
    assert.equal(isPickupTypeShootable('SHIELD', 'HUNT'), true);
});

test('Map schema validation keeps portal and gate fallback behavior explicit', () => {
    const warnings = [];
    const map = createMapDocument({
        portalMode: 'scripted',
        portals: [
            { a: [0, 12, 0] },
        ],
        gates: [
            { id: 'gate_legacy', type: 'boost_plus', pos: [0, 12, 0] },
        ],
        items: [
            { id: 'item_anchor', type: 'item_rocket', pickupType: 'LASER_BEAM', x: 4, y: 8, z: -6 },
        ],
    }, { warnings });

    assert.equal(map.portalMode, 'dynamic');
    assert.equal(map.portals.length, 0);
    assert.equal(map.gates.length, 1);
    assert.equal(map.gates[0].type, 'boost');
    assert.equal(map.gates[0].legacyType, 'boost_plus');
    assert.equal(map.gates[0].warningCode, 'map.warning.gate-type');
    assert.equal(map.items[0].pickupType, undefined);
    assert.ok(warnings.includes('Unsupported portalMode "scripted" normalized to "dynamic".'));
    assert.ok(warnings.includes('Portal pair 1 was ignored because both "a" and "b" vectors are required.'));
    assert.ok(warnings.includes('Unknown gate type "boost_plus" normalized to "boost".'));
    assert.ok(warnings.includes('Item anchor item_anchor uses unsupported pickupType "LASER_BEAM"; runtime falls back to item type/model.'));
});

test('Shield semantics stay deterministic across classic and hunt strategies', () => {
    const classic = new ClassicModeStrategy();
    const hunt = new HuntModeStrategy();

    const classicPlayer = { hasShield: false, maxShieldHp: 0, shieldHP: 0, hp: 1, maxHp: 1, lastDamageTimestamp: 0 };
    assert.equal(classic.grantShield(classicPlayer), 1);
    assert.equal(classicPlayer.shieldHP, 1);
    const classicDamage = classic.applyDamage(classicPlayer, 1, { nowSeconds: 12 });
    assert.equal(classicDamage.isDead, true);
    assert.equal(classicPlayer.hp, 0);
    assert.equal(classicPlayer.shieldHP, 0);
    assert.equal(classicPlayer.lastDamageTimestamp, 12);

    const huntPlayer = {
        hasShield: false,
        maxHp: 100,
        hp: 100,
        maxShieldHp: 0,
        shieldHP: 0,
        shieldHitFeedback: 0,
        lastDamageTimestamp: 0,
    };
    assert.equal(hunt.grantShield(huntPlayer), 40);
    assert.equal(huntPlayer.shieldHP, 40);
    const shieldOnlyHit = hunt.applyDamage(huntPlayer, 25, { nowSeconds: 7 });
    assert.equal(shieldOnlyHit.absorbedByShield, 25);
    assert.equal(shieldOnlyHit.remainingHp, 100);
    assert.equal(shieldOnlyHit.isDead, false);
    assert.equal(huntPlayer.shieldHP, 15);
    assert.equal(huntPlayer.hasShield, true);

    const shieldBreakHit = hunt.applyDamage(huntPlayer, 20, { nowSeconds: 9 });
    assert.equal(shieldBreakHit.absorbedByShield, 15);
    assert.equal(shieldBreakHit.remainingHp, 95);
    assert.equal(shieldBreakHit.isDead, false);
    assert.equal(huntPlayer.shieldHP, 0);
    assert.equal(huntPlayer.hasShield, false);
    assert.equal(huntPlayer.lastDamageTimestamp, 9);
});

test('Round recorder diagnostics keep failed item actions analyzable by mode and code', () => {
    const metrics = new RoundMetricsStore({ timeProvider: () => 12 });
    metrics.startRound([]);
    metrics.registerEventType('ITEM_USE', 'mode=use type=SHIELD code=item.use.forbidden ok=0');
    metrics.registerEventType('ITEM_USE', 'mode=shoot type=ROCKET_WEAK code=item.shoot.cooldown ok=0');
    metrics.registerEventType('ITEM_USE', 'mode=shoot type=ROCKET_WEAK code=item.shoot.success ok=1');
    metrics.registerEventType('ITEM_USE', 'mode=mg type=MG_BULLET code=mg.shoot.overheated ok=0');
    metrics.registerEventType('ITEM_USE', 'mode=other type=UNKNOWN code=unknown ok=0');
    metrics.finalizeRound(null, []);

    const lastRound = metrics.getLastRoundMetrics();
    assert.equal(lastRound.itemUseEvents, 5);
    assert.equal(lastRound.failedItemActions, 3);
    assert.deepEqual(lastRound.failedItemActionModeCounts, {
        use: 1,
        shoot: 1,
        mg: 1,
        other: 0,
    });
    assert.equal(lastRound.failedItemActionCodeCounts['item.use.forbidden'], 1);
    assert.equal(lastRound.failedItemActionCodeCounts['item.shoot.cooldown'], 1);
    assert.equal(lastRound.failedItemActionCodeCounts['mg.shoot.overheated'], 1);

    const aggregate = metrics.getAggregateMetrics();
    assert.equal(aggregate.failedItemActionsPerRound, 3);
    assert.equal(aggregate.itemUseFailureRate, 0.6);
    assert.equal(aggregate.failedItemActionModePerRound.use, 1);
    assert.equal(aggregate.failedItemActionModePerRound.shoot, 1);
    assert.equal(aggregate.failedItemActionModePerRound.mg, 1);
    assert.equal(aggregate.failedItemActionCodeTotals['item.use.forbidden'], 1);
    assert.equal(aggregate.failedItemActionCodeTotals['item.shoot.cooldown'], 1);
    assert.equal(aggregate.failedItemActionCodeTotals['mg.shoot.overheated'], 1);
});
