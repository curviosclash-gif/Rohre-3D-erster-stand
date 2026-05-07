import assert from 'node:assert/strict';
import test from 'node:test';

import { LastRoundGhostSystem } from '../src/entities/LastRoundGhostSystem.js';

function createRendererStub() {
    return {
        addToScene() {},
    };
}

test('LastRoundGhostSystem normalizes broken time and pose data without destabilizing playback', () => {
    const system = new LastRoundGhostSystem(createRendererStub());
    const playable = system.playClip({
        routeId: 'route_alpha',
        sourceDuration: 2,
        displayDuration: 1,
        frames: [
            { time: 0, players: [{ idx: 0, x: 0, y: 0, z: 0, qx: 0, qy: 0, qz: 0, qw: 1 }] },
            { time: 0.7, players: [{ idx: 0, x: Number.POSITIVE_INFINITY, y: 0, z: 0, qx: Number.NaN, qy: 0, qz: 0, qw: 0 }] },
            { time: 0.4, players: [{ idx: 0, x: 4, y: 0, z: 1, qx: 0, qy: 0.5, qz: 0, qw: 0.5 }] },
            { time: 2, players: [{ idx: 0, x: 8, y: 0, z: 2, qx: 0, qy: 0, qz: 0, qw: 0 }] },
        ],
    });

    assert.equal(playable, true);
    assert.doesNotThrow(() => system.update(0.25));
    assert.doesNotThrow(() => system.update(0.5));

    const state = system.getState();
    assert.equal(state.active, true);
    assert.equal(state.routeId, 'route_alpha');
    assert.equal(state.frameCount, 4);
    assert.equal(state.trailCount, 1);
    assert.equal(state.trailPointCount > 1, true);
    assert.equal(state.trailSegmentCount > 0, true);
    assert.equal(state.ghosts[0]?.trailPoints > 1, true);
    assert.equal(state.ghosts[0]?.trailSegments > 0, true);
    assert.equal(Number.isFinite(state.ghosts[0]?.x), true);
    assert.equal(Number.isFinite(state.ghosts[0]?.y), true);
    assert.equal(Number.isFinite(state.ghosts[0]?.z), true);
    assert.equal(system._entries[0]?.trail?.isInstancedMesh, true);
    assert.equal(Number.isFinite(system._entries[0]?.group?.quaternion?.x), true);
    assert.equal(Number.isFinite(system._entries[0]?.group?.quaternion?.w), true);

    system.dispose();
});

test('LastRoundGhostSystem rejects ghost clips that are not renderable', () => {
    const system = new LastRoundGhostSystem(createRendererStub());
    const playable = system.playClip({
        sourceDuration: 1,
        displayDuration: 1,
        frames: [
            { time: 0, players: [{ idx: 0, x: 0, y: 0, z: 0, alive: false }] },
            { time: 1, players: [{ idx: 0, x: 1, y: 0, z: 0, alive: false }] },
        ],
    });

    assert.equal(playable, false);
    assert.equal(system.getState().active, false);

    system.dispose();
});
