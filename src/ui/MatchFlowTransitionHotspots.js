function getLegacyRuntimeFacade(game) {
    return game?.runtimeFacade || null;
}

function getLegacyArcadeRuntime(game) {
    return getLegacyRuntimeFacade(game)?.arcadeRunRuntime || null;
}

function getLegacyRoundRecorder(game) {
    return game?.recorder || null;
}

// Transition-only adapters keep legacy game/runtimeFacade access centralized
// until the dedicated recorder and arcade follow-up blocks can remove them.
function createLegacyArcadeTransitionAdapter(game) {
    const runtimeFacade = getLegacyRuntimeFacade(game);
    const arcadeRuntime = getLegacyArcadeRuntime(game);
    return {
        getMenuSurfaceState() {
            return runtimeFacade?.getArcadeMenuSurfaceState?.()
                ?? arcadeRuntime?.getMenuSurfaceState?.()
                ?? null;
        },
        selectIntermissionChoice(choiceId) {
            return runtimeFacade?.selectArcadeIntermissionChoice?.(choiceId)
                ?? arcadeRuntime?.selectIntermissionChoice?.(choiceId);
        },
        selectReward(rewardId) {
            return runtimeFacade?.selectArcadeReward?.(rewardId)
                ?? arcadeRuntime?.selectReward?.(rewardId);
        },
        requestReplayPlayback() {
            return runtimeFacade?.requestArcadeReplayPlayback?.()
                ?? arcadeRuntime?.requestReplayPlayback?.();
        },
    };
}

function createLegacyRecordingTransitionAdapter(game) {
    const runtimeFacade = getLegacyRuntimeFacade(game);
    const recorder = getLegacyRoundRecorder(game);
    return {
        finalizeRound(winner, players, options = undefined) {
            return runtimeFacade?.finalizeRoundRecording?.(winner, players, options)
                ?? recorder?.finalizeRound?.(winner, players, options);
        },
        dump() {
            return runtimeFacade?.dumpRoundRecording?.()
                ?? recorder?.dump?.();
        },
        getLastRoundMetrics() {
            return runtimeFacade?.getLastRoundRecordingMetrics?.()
                ?? recorder?.getLastRoundMetrics?.()
                ?? null;
        },
        getAggregateMetrics() {
            return runtimeFacade?.getAggregateRecordingMetrics?.()
                ?? recorder?.getAggregateMetrics?.()
                ?? null;
        },
        getLastRoundGhostClip(players, options = undefined) {
            return runtimeFacade?.getLastRoundGhostClip?.(players, options)
                ?? recorder?.getLastRoundGhostClip?.(players, options)
                ?? null;
        },
    };
}

function createLegacySessionTransitionAdapter(game) {
    const runtimeFacade = getLegacyRuntimeFacade(game);
    return {
        initializeSession() {
            return runtimeFacade?.initializeSession?.();
        },
        waitForAllPlayersLoaded() {
            return runtimeFacade?.waitForAllPlayersLoaded?.();
        },
        startArcadeRunIfEnabled() {
            return runtimeFacade?.startArcadeRunIfEnabled?.();
        },
        recordRoundEndTelemetry(payload = null) {
            return runtimeFacade?.recordRoundEndTelemetry?.(payload);
        },
        recordMatchEndTelemetry(payload = null) {
            return runtimeFacade?.recordMatchEndTelemetry?.(payload);
        },
        getSessionRuntimeSnapshot() {
            return {
                isNetworkSession: runtimeFacade?.isNetworkSession?.() === true,
                isHost: runtimeFacade?.isHost?.() !== false,
            };
        },
        syncP2HudVisibility(isVisible) {
            const p2Hud = game?.ui?.p2Hud;
            if (p2Hud?.classList?.toggle) {
                p2Hud.classList.toggle('hidden', !isVisible);
                return;
            }
            runtimeFacade?.syncP2HudVisibility?.();
        },
    };
}

export function getArcadeMenuSurfaceState(runtimePort, game) {
    return runtimePort?.getArcadeMenuSurfaceState?.()
        ?? createLegacyArcadeTransitionAdapter(game).getMenuSurfaceState();
}

export function selectArcadeIntermissionChoice(runtimePort, game, choiceId) {
    return runtimePort?.selectArcadeIntermissionChoice?.(choiceId)
        ?? createLegacyArcadeTransitionAdapter(game).selectIntermissionChoice(choiceId);
}

export function selectArcadeReward(runtimePort, game, rewardId) {
    return runtimePort?.selectArcadeReward?.(rewardId)
        ?? createLegacyArcadeTransitionAdapter(game).selectReward(rewardId);
}

export function requestArcadeReplayPlayback(runtimePort, game) {
    return runtimePort?.requestArcadeReplayPlayback?.()
        ?? createLegacyArcadeTransitionAdapter(game).requestReplayPlayback();
}

export function getLastRoundRecordingMetrics(runtimePort, game, roundEndPlan) {
    return roundEndPlan?.recording?.roundMetrics
        || runtimePort?.getLastRoundRecordingMetrics?.()
        || createLegacyRecordingTransitionAdapter(game).getLastRoundMetrics()
        || null;
}

export function getLastRoundGhostClip(runtimePort, game, options = undefined) {
    return runtimePort?.getLastRoundGhostClip?.(game?.entityManager?.players, options)
        ?? createLegacyRecordingTransitionAdapter(game).getLastRoundGhostClip(game?.entityManager?.players, options);
}

export function createRoundEndRecorderAdapter(runtimePort, game) {
    const adapter = {};
    if (typeof runtimePort?.finalizeRoundRecording === 'function') {
        adapter.finalizeRound = (winner, players, options = undefined) => runtimePort.finalizeRoundRecording(winner, players, options);
    }
    if (typeof runtimePort?.dumpRoundRecording === 'function') {
        adapter.dump = () => runtimePort.dumpRoundRecording();
    }
    if (typeof runtimePort?.getLastRoundRecordingMetrics === 'function') {
        adapter.getLastRoundMetrics = () => runtimePort.getLastRoundRecordingMetrics();
    }
    if (typeof runtimePort?.getAggregateRecordingMetrics === 'function') {
        adapter.getAggregateMetrics = () => runtimePort.getAggregateRecordingMetrics();
    }
    if (typeof runtimePort?.getLastRoundGhostClip === 'function') {
        adapter.getLastRoundGhostClip = (players, options = undefined) => runtimePort.getLastRoundGhostClip(players, options);
    }
    return Object.keys(adapter).length > 0 ? adapter : createLegacyRecordingTransitionAdapter(game);
}

export function initializeMatchSession(runtimePort, game) {
    return runtimePort?.initializeSession?.()
        ?? createLegacySessionTransitionAdapter(game).initializeSession();
}

export function waitForMatchPlayersLoaded(runtimePort, game) {
    return runtimePort?.waitForAllPlayersLoaded?.()
        ?? createLegacySessionTransitionAdapter(game).waitForAllPlayersLoaded();
}

export function startArcadeRunIfEnabled(runtimePort, game) {
    return runtimePort?.startArcadeRunIfEnabled?.()
        ?? createLegacySessionTransitionAdapter(game).startArcadeRunIfEnabled();
}

export function recordRoundEndTelemetry(runtimePort, game, payload = null) {
    return runtimePort?.recordRoundEndTelemetry?.(payload)
        ?? createLegacySessionTransitionAdapter(game).recordRoundEndTelemetry(payload);
}

export function recordMatchEndTelemetry(runtimePort, game, payload = null) {
    return runtimePort?.recordMatchEndTelemetry?.(payload)
        ?? createLegacySessionTransitionAdapter(game).recordMatchEndTelemetry(payload);
}

export function getMatchSessionAccessSnapshot(runtimePort, game) {
    return runtimePort?.getSessionRuntimeSnapshot?.()
        ?? createLegacySessionTransitionAdapter(game).getSessionRuntimeSnapshot();
}

export function syncMatchP2HudVisibility(runtimePort, game, isVisible) {
    if (typeof runtimePort?.toggleP2Hud === 'function') {
        runtimePort.toggleP2Hud(isVisible);
        return;
    }
    createLegacySessionTransitionAdapter(game).syncP2HudVisibility(isVisible);
}
