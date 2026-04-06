import assert from 'node:assert/strict';
import test from 'node:test';

import { GameRuntimeFacade } from '../src/core/GameRuntimeFacade.js';
import { toggleCinematicRecordingFromHotkey } from '../src/core/runtime/GameRuntimeRecordingSupport.js';
import { RECORDING_CAPTURE_PROFILE } from '../src/shared/contracts/RecordingCaptureContract.js';
import { createMatchFlowUiControllerPort } from '../src/shared/runtime/UiControllerRuntimePorts.js';
import { MatchKernel } from '../src/state/MatchKernel.js';
import { MATCH_KERNEL_CONSUMER_IDS, createMatchKernelConsumerRegistry } from '../src/state/MatchKernelConsumerAdapters.js';

test('MatchFlow UI controller port forwards runtime projections when provided', () => {
    const runtimeSnapshot = { tickIndex: 12 };
    const runtimeProjection = { lifecycle: 'running' };
    const port = createMatchFlowUiControllerPort({
        runtimeProjectionPort: {
            getSessionRuntimeSnapshot: () => runtimeSnapshot,
            getMatchRuntimeProjection: () => runtimeProjection,
        },
    });

    assert.equal(port.getSessionRuntimeSnapshot(), runtimeSnapshot);
    assert.equal(port.getMatchRuntimeProjection(), runtimeProjection);
});

test('Cinematic recording switch does not restart after stop failure', async () => {
    const toasts = [];
    let startCalls = 0;
    const recorder = {
        notifyLifecycleEvent() {},
        getSupportState() {
            return { canRecord: true };
        },
        startRecording() {
            startCalls += 1;
            return Promise.resolve({ started: true });
        },
        stopRecording() {
            return Promise.reject(new Error('stop-failed'));
        },
        isRecording() {
            return true;
        },
        getRecordingCaptureSettings() {
            return { profile: RECORDING_CAPTURE_PROFILE.STANDARD };
        },
        setRecordingCaptureSettings() {},
    };
    const renderer = {
        setRecordingCaptureSettings() {},
    };

    const result = toggleCinematicRecordingFromHotkey({
        game: {
            render() {},
        },
        getRuntimeHandle(key) {
            if (key === 'mediaRecorderSystem') return recorder;
            if (key === 'renderer') return renderer;
            return null;
        },
        showStatusToast(message, duration, variant) {
            toasts.push({ message, duration, variant });
        },
    });

    assert.equal(result, true);
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.equal(startCalls, 0);
    assert.match(toasts.at(-1)?.message || '', /Fehler beim Stoppen/);
    assert.equal(toasts.at(-1)?.variant, 'error');
});

test('MatchKernel signalRoundEnd stays idempotent during round-end lifecycle', () => {
    const kernel = new MatchKernel();
    kernel.boot({ roundIndex: 2 });

    kernel.signalRoundEnd({ roundPause: 3 });
    kernel.signalRoundEnd({ roundPause: 1 });

    assert.equal(kernel.lifecycle, 'round_end');
    assert.equal(kernel.roundPause, 1);
});

test('MatchKernel consumer registry exposes interactive adapter and descriptor', () => {
    const registry = createMatchKernelConsumerRegistry();
    try {
        const interactiveAdapter = registry.getAdapter(MATCH_KERNEL_CONSUMER_IDS.INTERACTIVE);
        assert.ok(interactiveAdapter);
        assert.equal(interactiveAdapter.consumerId, MATCH_KERNEL_CONSUMER_IDS.INTERACTIVE);
        assert.equal(registry.getAdapter(undefined)?.consumerId, MATCH_KERNEL_CONSUMER_IDS.INTERACTIVE);

        const descriptors = registry.getDescriptors();
        assert.equal(descriptors.interactive?.consumerId, MATCH_KERNEL_CONSUMER_IDS.INTERACTIVE);
    } finally {
        registry.dispose();
    }
});

test('GameRuntimeFacade match end telemetry uses dedicated arcade handler', () => {
    const payload = { state: 'MATCH_END', completedSectors: 3 };
    const calls = [];
    const telemetrySnapshot = { ok: true };
    const runtimeFacadeContext = {
        arcadeRunRuntime: {
            handleRoundEndTelemetry() {
                throw new Error('round-end handler should not be used for match-end telemetry');
            },
            handleMatchEndTelemetry(value) {
                calls.push(['arcade', value]);
                return { handled: true };
            },
        },
        _recordMenuTelemetry(eventType, value) {
            calls.push(['menu', eventType, value]);
            return telemetrySnapshot;
        },
    };

    const result = GameRuntimeFacade.prototype.recordMatchEndTelemetry.call(runtimeFacadeContext, payload);

    assert.equal(result, telemetrySnapshot);
    assert.deepEqual(calls, [
        ['arcade', payload],
        ['menu', 'match_end', payload],
    ]);
});
