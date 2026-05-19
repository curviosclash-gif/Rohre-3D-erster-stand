import assert from 'node:assert/strict';
import test from 'node:test';

import {
    DEFAULT_TRAINING_LOG_CAPACITY,
    createTrainingLogBuffer,
} from '../dev/training/trainingLogBuffer.js';

test('training log buffer retains the last 500 lines with monotonic indexes', () => {
    let now = 1_700_000_000_000;
    const buffer = createTrainingLogBuffer({ now: () => now++ });

    for (let index = 0; index < 1_000; index++) {
        buffer.append('stdout', `line-${index}`);
    }

    const retained = buffer.getLines();
    assert.equal(buffer.totalLines, 1_000);
    assert.equal(buffer.retainedLines, DEFAULT_TRAINING_LOG_CAPACITY);
    assert.equal(retained.length, DEFAULT_TRAINING_LOG_CAPACITY);
    assert.equal(retained[0].i, 500);
    assert.equal(retained[0].text, 'line-500');
    assert.equal(retained.at(-1).i, 999);
    assert.equal(retained.at(-1).text, 'line-999');
});

test('training log buffer keeps since filtering stable after wraparound', () => {
    const buffer = createTrainingLogBuffer({ capacity: 5, now: () => 42 });

    for (let index = 0; index < 8; index++) {
        buffer.append('stderr', `line-${index}`);
    }

    assert.deepEqual(buffer.getLines().map((entry) => entry.i), [3, 4, 5, 6, 7]);
    assert.deepEqual(buffer.getLinesSince(6).map((entry) => entry.text), ['line-6', 'line-7']);
    assert.deepEqual(buffer.getLinesSince(99), []);
});

test('training log buffer emits websocket-compatible line entries', () => {
    const buffer = createTrainingLogBuffer({ capacity: 10, now: () => 1234 });

    const emitted = buffer.append('system', 'first\n\nsecond\n');

    assert.deepEqual(emitted, [
        { i: 0, t: 1234, s: 'system', text: 'first' },
        { i: 1, t: 1234, s: 'system', text: 'second' },
    ]);
    assert.deepEqual(buffer.getLinesSince(1), [
        { i: 1, t: 1234, s: 'system', text: 'second' },
    ]);
});

test('training log buffer rejects invalid capacities', () => {
    assert.throws(() => createTrainingLogBuffer({ capacity: 0 }), /positive integer/);
    assert.throws(() => createTrainingLogBuffer({ capacity: 1.5 }), /positive integer/);
});
