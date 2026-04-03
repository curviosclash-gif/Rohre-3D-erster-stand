export function getArcadeMenuSurfaceState(runtimePort, game) {
    return runtimePort?.getArcadeMenuSurfaceState?.()
        ?? game?.runtimeFacade?.getArcadeMenuSurfaceState?.()
        ?? game?.runtimeFacade?.arcadeRunRuntime?.getMenuSurfaceState?.()
        ?? null;
}

export function selectArcadeIntermissionChoice(runtimePort, game, choiceId) {
    return runtimePort?.selectArcadeIntermissionChoice?.(choiceId)
        ?? game?.runtimeFacade?.selectArcadeIntermissionChoice?.(choiceId)
        ?? game?.runtimeFacade?.arcadeRunRuntime?.selectIntermissionChoice?.(choiceId);
}

export function selectArcadeReward(runtimePort, game, rewardId) {
    return runtimePort?.selectArcadeReward?.(rewardId)
        ?? game?.runtimeFacade?.selectArcadeReward?.(rewardId)
        ?? game?.runtimeFacade?.arcadeRunRuntime?.selectReward?.(rewardId);
}

export function requestArcadeReplayPlayback(runtimePort, game) {
    return runtimePort?.requestArcadeReplayPlayback?.()
        ?? game?.runtimeFacade?.requestArcadeReplayPlayback?.()
        ?? game?.runtimeFacade?.arcadeRunRuntime?.requestReplayPlayback?.();
}

export function getLastRoundRecordingMetrics(runtimePort, game, roundEndPlan) {
    return roundEndPlan?.recording?.roundMetrics
        || runtimePort?.getLastRoundRecordingMetrics?.()
        || game?.runtimeFacade?.getLastRoundRecordingMetrics?.()
        || game?.recorder?.getLastRoundMetrics?.()
        || null;
}

export function getLastRoundGhostClip(runtimePort, game, options = undefined) {
    return runtimePort?.getLastRoundGhostClip?.(game?.entityManager?.players, options)
        ?? game?.runtimeFacade?.getLastRoundGhostClip?.(game?.entityManager?.players, options)
        ?? game?.recorder?.getLastRoundGhostClip?.(game?.entityManager?.players, options)
        ?? null;
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
    return Object.keys(adapter).length > 0 ? adapter : (game?.recorder || null);
}
