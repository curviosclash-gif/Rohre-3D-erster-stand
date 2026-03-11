// ============================================
// MenuRuntimeDeveloperTrainingService.js - developer-panel training actions
// ============================================

function setTrainingOutput(ui, snapshot) {
    if (!ui?.developerTrainingOutput) return;
    if (!snapshot || typeof snapshot !== 'object') {
        ui.developerTrainingOutput.textContent = 'Kein Training ausgefuehrt.';
        return;
    }
    ui.developerTrainingOutput.textContent = JSON.stringify(snapshot, null, 2);
}

function syncSeedInput(ui, seed) {
    if (!ui?.developerTrainingSeedInput) return;
    const numericSeed = Number(seed);
    if (!Number.isFinite(numericSeed)) return;
    ui.developerTrainingSeedInput.value = String(Math.max(0, Math.trunc(numericSeed)));
}

function resolveTransitionLabel(snapshot) {
    const transition = snapshot?.latestTransition;
    if (!transition) return 'Training';
    const operation = String(transition.operation || 'step');
    const stepIndex = Number.isFinite(Number(transition.stepIndex)) ? Number(transition.stepIndex) : 0;
    return `${operation} @ step ${stepIndex}`;
}

function ensureTrainingApi(game) {
    if (!game?.debugApi) return false;
    return typeof game.debugApi.resetTrainingSession === 'function'
        && typeof game.debugApi.stepTrainingSession === 'function';
}

export function handleDeveloperTrainingResetAction({ game, event }) {
    if (!ensureTrainingApi(game)) {
        game?._showStatusToast?.('Training-API nicht verfuegbar.', 1600, 'error');
        return null;
    }
    const snapshot = game.debugApi.resetTrainingSession(event || {});
    setTrainingOutput(game.ui, snapshot);
    syncSeedInput(game.ui, snapshot?.seed);
    const domainId = snapshot?.latestTransition?.domainId || 'unknown-domain';
    game?._showStatusToast?.(`Training reset: ${domainId}`, 1300, 'info');
    return snapshot;
}

export function handleDeveloperTrainingStepAction({ game, event }) {
    if (!ensureTrainingApi(game)) {
        game?._showStatusToast?.('Training-API nicht verfuegbar.', 1600, 'error');
        return null;
    }
    const snapshot = game.debugApi.stepTrainingSession(event || {});
    setTrainingOutput(game.ui, snapshot);
    syncSeedInput(game.ui, snapshot?.seed);
    const transition = snapshot?.latestTransition;
    if (transition?.done || transition?.truncated) {
        const reason = transition?.terminalReason || transition?.truncatedReason || 'terminal';
        game?._showStatusToast?.(`Training episode beendet: ${reason}`, 1500, 'info');
        return snapshot;
    }
    game?._showStatusToast?.(`${resolveTransitionLabel(snapshot)} reward=${Number(transition?.reward || 0).toFixed(3)}`, 1300, 'info');
    return snapshot;
}

export function handleDeveloperTrainingAutoStepAction({ game, event }) {
    if (!ensureTrainingApi(game) || typeof game?.debugApi?.runTrainingAutoSteps !== 'function') {
        game?._showStatusToast?.('Training-API nicht verfuegbar.', 1600, 'error');
        return null;
    }
    const snapshot = game.debugApi.runTrainingAutoSteps(event || {});
    setTrainingOutput(game.ui, snapshot);
    syncSeedInput(game.ui, snapshot?.seed);

    const autoSummary = snapshot?.autoStep && typeof snapshot.autoStep === 'object'
        ? snapshot.autoStep
        : null;
    const transition = snapshot?.latestTransition || null;
    if (transition?.done || transition?.truncated) {
        const reason = transition?.terminalReason || transition?.truncatedReason || 'terminal';
        const executed = Number(autoSummary?.executedSteps || 0);
        game?._showStatusToast?.(`Auto Step beendet (${executed}): ${reason}`, 1500, 'info');
        return snapshot;
    }

    const executed = Number(autoSummary?.executedSteps || 0);
    game?._showStatusToast?.(`Auto Step: ${executed} Schritte, reward=${Number(transition?.reward || 0).toFixed(3)}`, 1500, 'info');
    return snapshot;
}
