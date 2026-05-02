import assert from 'node:assert/strict';
import test from 'node:test';

import {
    ARCADE_GHOST_LIBRARY_STORAGE_KEY,
    bootstrapGhostLibraryFromLeaderboard,
    getLongestGhostByRoute,
    loadGhostLibrary,
    saveGhostLibrary,
    upsertLongestGhostByRoute,
} from '../src/state/arcade/ArcadeGhostLibrary.js';
import { ArcadeGhostRecorder } from '../src/state/arcade/ArcadeGhostRecorder.js';

function createGhostClip(durationSeconds) {
    return {
        frames: [
            { time: 0, players: [{ idx: 0, x: 0, y: 0, z: 0 }] },
            { time: durationSeconds, players: [{ idx: 0, x: 10, y: 0, z: 10 }] },
        ],
        players: [{ idx: 0, color: 0xffffff }],
        sourceDuration: durationSeconds,
        displayDuration: durationSeconds,
    };
}

function createRecorderPlayer(index, x = 0) {
    return {
        index,
        alive: true,
        position: { x, y: 0, z: 0 },
        quaternion: { x: 0, y: 0, z: 0, w: 1 },
    };
}

test('ArcadeGhostRecorder keeps ownership on one player while recording', () => {
    const recorder = new ArcadeGhostRecorder();
    assert.equal(recorder.startRecording(1, 1000), true);

    recorder.sample(createRecorderPlayer(1, 10), 1050);
    recorder.sample(createRecorderPlayer(2, 99), 1100);
    assert.equal(recorder.startRecording(2, 1150), false);
    recorder.sample(createRecorderPlayer(1, 20), 1200);

    const clip = recorder.stopRecording();
    assert.ok(clip);
    assert.equal(clip.players[0]?.idx, 1);
    assert.equal(clip.frames.length, 2);
    assert.equal(clip.frames[0]?.players?.[0]?.idx, 1);
    assert.equal(clip.frames[1]?.players?.[0]?.idx, 1);
    assert.equal(clip.frames[0]?.players?.[0]?.x, 10);
    assert.equal(clip.frames[1]?.players?.[0]?.x, 20);
});

test('ArcadeGhostLibrary upsert keeps only the longest route ghost by durationMs', () => {
    const first = upsertLongestGhostByRoute({}, 'route_alpha', createGhostClip(3.2), 3200);
    assert.equal(first.changed, true);
    assert.equal(first.reason, 'created');
    assert.equal(first.ghostLibrary.route_alpha.durationMs, 3200);

    const shorter = upsertLongestGhostByRoute(first.ghostLibrary, 'route_alpha', createGhostClip(2.6), 2600);
    assert.equal(shorter.changed, false);
    assert.equal(shorter.reason, 'not_longer');
    assert.equal(shorter.ghostLibrary.route_alpha.durationMs, 3200);

    const longer = upsertLongestGhostByRoute(shorter.ghostLibrary, 'route_alpha', createGhostClip(4.1), 4100);
    assert.equal(longer.changed, true);
    assert.equal(longer.reason, 'replaced_longest');
    assert.equal(longer.ghostLibrary.route_alpha.durationMs, 4100);

    const longest = getLongestGhostByRoute(longer.ghostLibrary, 'route_alpha');
    assert.equal(longest?.durationMs, 4100);
    assert.equal(Array.isArray(longest?.longestGhostClip?.frames), true);
    assert.equal(longest?.longestGhostClip?.frames?.length, 2);
});

test('ArcadeGhostLibrary rejects malformed clips and invalid durations', () => {
    const invalidClip = upsertLongestGhostByRoute({}, 'route_alpha', { frames: [] }, 1500);
    assert.equal(invalidClip.changed, false);
    assert.equal(invalidClip.reason, 'invalid_clip');

    const missingDuration = upsertLongestGhostByRoute({}, 'route_alpha', {
        frames: [{ time: 0 }, { time: 0 }],
    }, 0);
    assert.equal(missingDuration.changed, false);
    assert.equal(missingDuration.reason, 'invalid_duration');

    const invalidRoute = upsertLongestGhostByRoute({}, '', createGhostClip(1.8), 1800);
    assert.equal(invalidRoute.changed, false);
    assert.equal(invalidRoute.reason, 'invalid_route');
});

test('ArcadeGhostLibrary bootstraps from leaderboard best ghost clips per route', () => {
    const leaderboard = {
        route_alpha: [
            {
                totalTimeMs: 5400,
                ghostClip: createGhostClip(5.4),
                date: '2026-05-01T10:00:00.000Z',
            },
        ],
        route_beta: [
            {
                totalTimeMs: 6200,
                ghostClip: null,
                date: '2026-05-01T10:01:00.000Z',
            },
        ],
    };

    const result = bootstrapGhostLibraryFromLeaderboard({}, leaderboard);
    assert.equal(result.changed, true);
    assert.equal(result.ghostLibrary.route_alpha.durationMs, 5400);
    assert.equal(result.ghostLibrary.route_beta, undefined);

    const noOverwrite = bootstrapGhostLibraryFromLeaderboard(result.ghostLibrary, {
        route_alpha: [{ totalTimeMs: 9000, ghostClip: createGhostClip(9) }],
    });
    assert.equal(noOverwrite.changed, false);
    assert.equal(noOverwrite.ghostLibrary.route_alpha.durationMs, 5400);
});

test('ArcadeGhostLibrary load/save normalizes persisted records', () => {
    const writes = [];
    const store = {
        loadJsonRecord(key) {
            assert.equal(key, ARCADE_GHOST_LIBRARY_STORAGE_KEY);
            return {
                route_alpha: {
                    durationMs: 4000,
                    longestGhostClip: createGhostClip(4),
                    updatedAt: '2026-05-01T10:02:00.000Z',
                },
                route_beta: {
                    durationMs: -5,
                    longestGhostClip: { frames: [] },
                },
            };
        },
        saveJsonRecord(key, value) {
            writes.push({ key, value });
        },
    };

    const loaded = loadGhostLibrary(store);
    assert.equal(Object.keys(loaded).length, 1);
    assert.equal(loaded.route_alpha.durationMs, 4000);

    saveGhostLibrary(store, loaded);
    assert.equal(writes.length, 1);
    assert.equal(writes[0].key, ARCADE_GHOST_LIBRARY_STORAGE_KEY);
    assert.equal(writes[0].value.route_alpha.durationMs, 4000);
    assert.equal(writes[0].value.route_beta, undefined);
});
