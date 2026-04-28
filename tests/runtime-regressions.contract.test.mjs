import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import { SessionRuntimeCommandExecutor } from '../src/application/session-runtime/SessionRuntimeCommandExecutor.js';
import { GameRuntimeFacade } from '../src/core/GameRuntimeFacade.js';
import { GameRuntimeCoordinator } from '../src/core/runtime/GameRuntimeCoordinator.js';
import { toggleCinematicRecordingFromHotkey } from '../src/core/runtime/GameRuntimeRecordingSupport.js';
import { RECORDING_CAPTURE_PROFILE } from '../src/shared/contracts/RecordingCaptureContract.js';
import { createStartMatchCommand } from '../src/shared/contracts/SessionRuntimeCommandContract.js';
import { SESSION_RUNTIME_EVENT_TYPES } from '../src/shared/contracts/SessionRuntimeEventContract.js';
import { createArcadePort } from '../src/shared/runtime/GameRuntimeFeaturePorts.js';
import {
    createLifecyclePort,
    createRuntimeIntentPort,
    createRuntimeProjectionPort,
} from '../src/shared/runtime/GameRuntimePorts.js';
import { createFallbackSessionRuntimeState } from '../src/state/MatchLifecycleSessionRuntimeState.js';
import { createMatchFlowUiControllerPort } from '../src/shared/runtime/UiControllerRuntimePorts.js';
import { MatchKernel } from '../src/state/MatchKernel.js';
import { MATCH_KERNEL_CONSUMER_IDS, createMatchKernelConsumerRegistry } from '../src/state/MatchKernelConsumerAdapters.js';
import { MatchFlowLifecycleController } from '../src/ui/MatchFlowLifecycleController.js';
import { MatchFlowTelemetryController } from '../src/ui/MatchFlowTelemetryController.js';
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

test('MatchFlowLifecycleController delegates returnToMenu to the injected runtime port', () => {
    const calls = [];
    const lifecycleController = new MatchFlowLifecycleController({
        matchFlowUiController: {
            applyLifecycleTransition() {
                throw new Error('fallback applyLifecycleTransition should not run while runtimePort handles returnToMenu');
            },
            applyMatchUiState() {
                throw new Error('fallback applyMatchUiState should not run while runtimePort handles returnToMenu');
            },
            resetCrosshairUi() {
                throw new Error('fallback resetCrosshairUi should not run while runtimePort handles returnToMenu');
            },
        },
        game: {},
        runtimePort: {
            returnToMenu(options = undefined) {
                calls.push(options);
                return 'runtime-port-return';
            },
        },
    });

    const result = lifecycleController.returnToMenu({ reason: 'contract-test' });

    assert.equal(result, 'runtime-port-return');
    assert.deepEqual(calls, [{ reason: 'contract-test' }]);
});

test('MatchFlowTelemetryController binds hunt feedback through the extracted telemetry seam', () => {
    const game = {
        huntState: {
            killFeed: [],
        },
    };
    let boundHandlers = null;
    const telemetryController = new MatchFlowTelemetryController({ game });

    telemetryController.bindHuntEventHandlers({
        bindHuntEventHandlers(handlers) {
            boundHandlers = handlers;
        },
    });

    assert.equal(typeof boundHandlers?.onHuntFeedEvent, 'function');
    boundHandlers.onHuntFeedEvent('Sector clear');

    assert.deepEqual(game.huntState.killFeed, ['Sector clear']);
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

test('Runtime intent port no longer falls back to legacy runtimeFacade for migrated commands (92.3.1)', () => {
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

    assert.equal(result, undefined);
    assert.deepEqual(calls, []);
});

test('lifecyclePort no longer falls back to legacy runtimeFacade for migrated session lifecycle paths (92.3.1)', () => {
    const calls = [];
    const game = {
        runtimeFacade: {
            initializeSession() {
                calls.push('legacy-facade');
                return 'legacy-facade';
            },
        },
    };

    const port = createLifecyclePort(game);
    const result = port.initializeSession();

    assert.equal(result, undefined);
    assert.deepEqual(calls, []);
});

test('session runtime snapshot resolves session contract without legacy runtimeFacade fallback (92.3.1)', () => {
    const updatedAt = Date.now();
    const game = {
        settings: {
            localSettings: {
                sessionType: 'multiplayer',
                multiplayerTransport: 'lan',
            },
        },
        session: {
            isHost: false,
        },
        runtimeBundle: {
            sessionRuntime: {
                session: {
                    activeSessionId: 'session-42',
                },
                lifecycle: {
                    status: 'running',
                    gameStateId: 'PLAYING',
                    pendingSessionInit: null,
                    updatedAt,
                },
                finalize: {
                    status: 'idle',
                    lastTrigger: null,
                    errorMessage: null,
                    updatedAt,
                },
            },
        },
        runtimeFacade: {
            isNetworkSession() {
                throw new Error('legacy runtimeFacade should not be read');
            },
        },
    };

    const port = createRuntimeProjectionPort(game);
    const snapshot = port.getSessionRuntimeSnapshot();

    assert.equal(snapshot.sessionId, 'session-42');
    assert.equal(snapshot.sessionType, 'multiplayer');
    assert.equal(snapshot.runtimeTransportKind, 'lan');
    assert.equal(snapshot.isNetworkSession, true);
    assert.equal(snapshot.isHost, false);
});

test('ArcadeMenuSurface no longer reads GAME_INSTANCE/GAME_RUNTIME in productive runtime path (92.3.2)', () => {
    const source = fs.readFileSync(new URL('../src/ui/arcade/ArcadeMenuSurface.js', import.meta.url), 'utf8');
    assert.equal(source.includes('window.GAME_INSTANCE'), false);
    assert.equal(source.includes('window.GAME_RUNTIME'), false);
});

test('SessionRuntimeCommandExecutor settled result stays on the use-case boundary for async failures (92.2.2)', async () => {
    const sessionRuntime = createFallbackSessionRuntimeState();
    const runtimeBundle = { sessionRuntime };
    const executor = new SessionRuntimeCommandExecutor({
        facade: {
            game: {},
            getRuntimeBundle() {
                return runtimeBundle;
            },
            sessionHandler: {
                startMatch() {
                    return Promise.reject(new Error('command-boom'));
                },
            },
        },
    });

    await assert.rejects(
        executor.execute(createStartMatchCommand({ source: 'raw_start' })),
        /command-boom/
    );

    const settledResult = await executor.executeResult(createStartMatchCommand({ source: 'settled_start' }));
    const failedEvents = sessionRuntime.observability.events.filter((event) => (
        event.type === SESSION_RUNTIME_EVENT_TYPES.COMMAND_OBSERVED
        && event.payload?.phase === 'failed'
        && event.payload?.resultStatus === 'rejected'
    ));

    assert.equal(settledResult.ok, false);
    assert.equal(settledResult.commandType, 'start_match');
    assert.equal(settledResult.resultStatus, 'rejected');
    assert.equal(settledResult.errorMessage, 'command-boom');
    assert.ok(failedEvents.length >= 2);
    assert.ok(failedEvents.every((event) => event.source === 'session_runtime_command_use_case'));
});

test('SessionRuntimeCommandExecutor invalid command results also route through the use-case boundary (92.2.2)', async () => {
    const sessionRuntime = createFallbackSessionRuntimeState();
    const runtimeBundle = { sessionRuntime };
    const executor = new SessionRuntimeCommandExecutor({
        facade: {
            game: {},
            getRuntimeBundle() {
                return runtimeBundle;
            },
        },
    });

    const rawResult = executor.execute({
        type: 'not_a_real_command',
        payload: { source: 'manual_probe' },
    });
    const settledResult = await executor.executeResult({
        type: 'not_a_real_command',
        payload: { source: 'manual_probe' },
    });
    const failedEvents = sessionRuntime.observability.events.filter((event) => (
        event.type === SESSION_RUNTIME_EVENT_TYPES.COMMAND_OBSERVED
        && event.payload?.phase === 'failed'
        && event.payload?.resultStatus === 'invalid_command'
    ));

    assert.equal(rawResult, undefined);
    assert.equal(settledResult.ok, false);
    assert.equal(settledResult.commandType, 'not_a_real_command');
    assert.equal(settledResult.commandSource, 'manual_probe');
    assert.equal(settledResult.resultStatus, 'invalid_command');
    assert.equal(settledResult.errorMessage, 'invalid session runtime command');
    assert.ok(failedEvents.length >= 2);
    assert.ok(failedEvents.every((event) => event.source === 'session_runtime_command_use_case'));
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

test('Cinematic recording stop toast includes engine and master-delivery diagnostics', async () => {
    const toasts = [];
    const recorder = {
        notifyLifecycleEvent() {},
        getSupportState() {
            return { canRecord: true };
        },
        startRecording() {
            return Promise.resolve({ started: true });
        },
        stopRecording() {
            return Promise.resolve({
                stopped: true,
                sizeBytes: 1_048_576,
                mimeType: 'video/webm',
                captureExportPreset: 'youtube-mp4',
                masterContainer: 'webm',
                deliveryContainer: 'mp4',
                transcodeApplied: true,
                recorderEngine: 'mediarecorder-native',
                deliveryPath: 'C:\\captures\\cinematic-export.mp4',
            });
        },
        isRecording() {
            return true;
        },
        getRecordingCaptureSettings() {
            return { profile: RECORDING_CAPTURE_PROFILE.CINEMATIC };
        },
        setRecordingCaptureSettings() {},
    };

    const result = toggleCinematicRecordingFromHotkey({
        game: {
            render() {},
        },
        getRuntimeHandle(key) {
            if (key === 'mediaRecorderSystem') return recorder;
            if (key === 'renderer') return { setRecordingCaptureSettings() {} };
            return null;
        },
        showStatusToast(message, duration, variant) {
            toasts.push({ message, duration, variant });
        },
    });

    assert.equal(result, true);
    await new Promise((resolve) => setTimeout(resolve, 0));

    const summaryToast = toasts.at(-1) || null;
    assert.ok(summaryToast);
    assert.equal(summaryToast.variant, 'success');
    assert.match(summaryToast.message, /Engine: MediaRecorder/);
    assert.match(summaryToast.message, /Master: WEBM -> Delivery: MP4/);
    assert.match(summaryToast.message, /Ziel: cinematic-export\.mp4/);
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
        _arcadeSupport: {
            recordMatchEndTelemetry(value, options = {}) {
                calls.push(['arcade', value]);
                return options.recordMenuTelemetry?.('match_end', value);
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

test('GameRuntimeFacade recording helpers delegate to recording support seam (92.4.2)', () => {
    const calls = [];
    const runtimeFacadeContext = {
        _recordingSupport: {
            toggleCinematicRecordingFromHotkey() {
                calls.push(['toggle']);
                return 'toggle-result';
            },
            finalizeRound(winner, players, options) {
                calls.push(['finalize', winner, players, options]);
                return 'finalize-result';
            },
            dump() {
                calls.push(['dump']);
                return 'dump-result';
            },
        },
    };

    const toggleResult = GameRuntimeFacade.prototype.toggleCinematicRecordingFromHotkey.call(runtimeFacadeContext);
    const finalizeResult = GameRuntimeFacade.prototype.finalizeRoundRecording.call(
        runtimeFacadeContext,
        'winner',
        ['p1', 'p2'],
        { reason: 'contract-test' }
    );
    const dumpResult = GameRuntimeFacade.prototype.dumpRoundRecording.call(runtimeFacadeContext);

    assert.equal(toggleResult, 'toggle-result');
    assert.equal(finalizeResult, 'finalize-result');
    assert.equal(dumpResult, 'dump-result');
    assert.deepEqual(calls, [
        ['toggle'],
        ['finalize', 'winner', ['p1', 'p2'], { reason: 'contract-test' }],
        ['dump'],
    ]);
});

test('GameRuntimeFacade arcade helpers delegate to arcade support seam (92.4.2)', () => {
    const calls = [];
    const runtimeFacadeContext = {
        _arcadeSupport: {
            startRunIfEnabled() {
                calls.push(['start']);
                return 'start-result';
            },
            getMenuSurfaceState() {
                calls.push(['menu-state']);
                return { phase: 'intermission' };
            },
            requestReplayPlayback() {
                calls.push(['replay']);
                return { code: 'ok' };
            },
        },
    };

    const startResult = GameRuntimeFacade.prototype.startArcadeRunIfEnabled.call(runtimeFacadeContext);
    const menuStateResult = GameRuntimeFacade.prototype.getArcadeMenuSurfaceState.call(runtimeFacadeContext);
    const replayResult = GameRuntimeFacade.prototype.requestArcadeReplayPlayback.call(runtimeFacadeContext);

    assert.equal(startResult, 'start-result');
    assert.deepEqual(menuStateResult, { phase: 'intermission' });
    assert.deepEqual(replayResult, { code: 'ok' });
    assert.deepEqual(calls, [
        ['start'],
        ['menu-state'],
        ['replay'],
    ]);
});
