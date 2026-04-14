import assert from 'node:assert/strict';
import test from 'node:test';

import { GameRuntimeFacade } from '../src/core/GameRuntimeFacade.js';
import { GameRuntimeCoordinator } from '../src/core/runtime/GameRuntimeCoordinator.js';
import { toggleCinematicRecordingFromHotkey } from '../src/core/runtime/GameRuntimeRecordingSupport.js';
import { RECORDING_CAPTURE_PROFILE } from '../src/shared/contracts/RecordingCaptureContract.js';
import { createArcadePort } from '../src/shared/runtime/GameRuntimeFeaturePorts.js';
import { createLifecyclePort, createRuntimeIntentPort } from '../src/shared/runtime/GameRuntimePorts.js';
import { createMatchFlowUiControllerPort } from '../src/shared/runtime/UiControllerRuntimePorts.js';
import { MatchKernel } from '../src/state/MatchKernel.js';
import { MATCH_KERNEL_CONSUMER_IDS, createMatchKernelConsumerRegistry } from '../src/state/MatchKernelConsumerAdapters.js';
import { resolveDeveloperReleaseState, resolveMenuUiSyncContext } from '../src/ui/menu/MenuUiSyncContext.js';

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

test('Runtime intent port resolves bundle adapters before legacy runtime slots', () => {
    const calls = [];
    const game = {
        runtimeBundle: {
            components: {
                runtimeCoordinator: {
                    startMatch(options = undefined) {
                        calls.push(['bundle-coordinator', options]);
                        return 'bundle-coordinator';
                    },
                },
            },
        },
        runtimeCoordinator: {
            startMatch(options = undefined) {
                calls.push(['legacy-coordinator', options]);
                return 'legacy-coordinator';
            },
        },
        runtimeFacade: {
            startMatch(options = undefined) {
                calls.push(['legacy-facade', options]);
                return 'legacy-facade';
            },
        },
    };

    const port = createRuntimeIntentPort(game);
    const result = port.startMatch({ source: 'contract-test' });

    assert.equal(result, 'bundle-coordinator');
    assert.deepEqual(calls, [['bundle-coordinator', { source: 'contract-test' }]]);
});

test('Runtime intent port keeps legacy runtimeFacade only as explicit rest adapter fallback', () => {
    const calls = [];
    const game = {
        runtimeFacade: {
            returnToMenu(options = undefined) {
                calls.push(options);
                return 'legacy-facade';
            },
        },
    };

    const port = createRuntimeIntentPort(game);
    const result = port.returnToMenu({ reason: 'contract-test' });

    assert.equal(result, 'legacy-facade');
    assert.deepEqual(calls, [{ reason: 'contract-test' }]);
});

test('GameRuntimeCoordinator does not consume raw runtime slot fallbacks for ports or facade handles', () => {
    const runtime = {
        runtimePorts: { id: 'legacy-runtime-ports' },
        runtimeFacade: { id: 'legacy-runtime-facade' },
        uiManager: { id: 'legacy-runtime-ui-manager' },
    };
    const coordinator = new GameRuntimeCoordinator({ runtime });

    assert.equal(coordinator.getPorts(), null);
    assert.equal(coordinator.getRuntimeFacade(), null);
    assert.equal(coordinator.getUiManager(), null);
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

test('arcadePort.tickSuddenDeath delegates to coordinator before facade (91.3.2)', () => {
    const calls = [];
    const port = createArcadePort({
        getRuntimeCoordinator: () => ({
            tickArcadeSuddenDeath(dt) {
                calls.push(['coordinator', dt]);
                return 'coordinator';
            },
        }),
        getRuntimeFacade: () => ({
            tickArcadeSuddenDeath(dt) {
                calls.push(['facade', dt]);
                return 'facade';
            },
        }),
    });

    const result = port.tickSuddenDeath(16);
    assert.equal(result, 'coordinator');
    assert.deepEqual(calls, [['coordinator', 16]]);
});

test('lifecyclePort.restartRound delegates through intent adapter chain (91.3.2)', () => {
    const calls = [];
    const game = {
        runtimeBundle: {
            components: {
                runtimeCoordinator: {
                    restartRound() {
                        calls.push('bundle-coordinator');
                        return 'bundle-coordinator';
                    },
                },
            },
        },
    };
    const port = createLifecyclePort(game);
    const result = port.restartRound();
    assert.equal(result, 'bundle-coordinator');
    assert.deepEqual(calls, ['bundle-coordinator']);
});

test('runtimeIntentPort.handleMenuPanelChanged delegates through intent adapter chain (91.3.2)', () => {
    const calls = [];
    const game = {
        runtimeBundle: {
            components: {
                runtimeCoordinator: {
                    handleMenuPanelChanged(prev, next, meta) {
                        calls.push(['coordinator', prev, next, meta]);
                        return 'coordinator';
                    },
                },
            },
        },
    };
    const port = createRuntimeIntentPort(game);
    const result = port.handleMenuPanelChanged('menu-main', 'submenu-game', { trigger: 'nav' });
    assert.equal(result, 'coordinator');
    assert.deepEqual(calls, [['coordinator', 'menu-main', 'submenu-game', { trigger: 'nav' }]]);
});

test('Menu UI sync context resolves access, release, and surface state via one shared resolver (91.3.4)', () => {
    const settings = {
        menuFeatureFlags: {
            developerModeEnabled: false,
        },
        localSettings: {
            ownerId: 'owner',
            actorId: 'owner',
            developerModeVisibility: 'owner_only',
            releasePreviewEnabled: true,
            sessionType: 'single',
            modePath: 'normal',
        },
        mapKey: 'standard',
    };
    const menuUiContext = resolveMenuUiSyncContext(settings, { runtimeGlobal: { __CURVIOS_APP__: true } });

    assert.equal(menuUiContext.surfacePolicy?.productSurfaceId, 'desktop-app');
    assert.equal(menuUiContext.surfaceMenuState?.sessionType, 'single');
    assert.equal(menuUiContext.surfaceMenuState?.modePath, 'normal');
    assert.equal(menuUiContext.accessContext?.isOwner, true);
    assert.equal(menuUiContext.releaseState?.featureEnabled, false);
    assert.equal(menuUiContext.releaseState?.releaseCutEnabled, true);
});

test('Developer release state helper keeps release-cut contract stable (91.3.4)', () => {
    const releaseState = resolveDeveloperReleaseState({
        menuFeatureFlags: { developerModeEnabled: true },
        localSettings: { releasePreviewEnabled: false },
    });
    const releaseCutState = resolveDeveloperReleaseState({
        menuFeatureFlags: { developerModeEnabled: true },
        localSettings: { releasePreviewEnabled: true },
    });

    assert.deepEqual(releaseState, {
        featureEnabled: true,
        releasePreviewEnabled: false,
        developerUiHidden: false,
        releaseCutEnabled: false,
    });
    assert.deepEqual(releaseCutState, {
        featureEnabled: true,
        releasePreviewEnabled: true,
        developerUiHidden: false,
        releaseCutEnabled: true,
    });
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
