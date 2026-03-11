// ============================================
// MenuDeveloperTrainingEventPayload.js - builders for developer training menu events
// ============================================

function toTrimmedString(value, fallback = '') {
    if (typeof value !== 'string') return fallback;
    const trimmed = value.trim();
    return trimmed || fallback;
}

function toInt(value, fallback, min, max) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return fallback;
    const intValue = Math.trunc(numeric);
    const clampedMin = Number.isFinite(Number(min)) ? Number(min) : intValue;
    const clampedMax = Number.isFinite(Number(max)) ? Number(max) : intValue;
    return Math.max(clampedMin, Math.min(clampedMax, intValue));
}

function toNonNegativeNumber(value, fallback = 0) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return fallback;
    return Math.max(0, numeric);
}

function resolveCommonTrainingConfig(ui) {
    return {
        mode: toTrimmedString(ui?.developerTrainingModeSelect?.value, 'classic'),
        planarMode: !!ui?.developerTrainingPlanarToggle?.checked,
        maxSteps: toInt(ui?.developerTrainingMaxStepsInput?.value, 180, 1, 1000000),
        seed: toInt(ui?.developerTrainingSeedInput?.value, 0, 0, 1000000),
        inventoryLength: toInt(ui?.developerTrainingInventoryInput?.value, 2, 0, 20),
    };
}

function resolveAction(ui) {
    const yawIntent = toInt(ui?.developerTrainingYawSelect?.value, 0, -1, 1);
    const pitchIntent = toInt(ui?.developerTrainingPitchSelect?.value, 0, -1, 1);
    return {
        yawLeft: yawIntent < 0,
        yawRight: yawIntent > 0,
        pitchDown: pitchIntent < 0,
        pitchUp: pitchIntent > 0,
        boost: !!ui?.developerTrainingBoostToggle?.checked,
        shootMG: !!ui?.developerTrainingShootMgToggle?.checked,
        shootItem: !!ui?.developerTrainingShootItemToggle?.checked,
        shootItemIndex: toInt(ui?.developerTrainingShootItemIndexInput?.value, -1, -1, 20),
    };
}

function resolveRewardSignals(ui) {
    return {
        survival: true,
        kills: toInt(ui?.developerTrainingKillsInput?.value, 0, 0, 10000),
        damageDealt: toNonNegativeNumber(ui?.developerTrainingDamageDealtInput?.value, 0),
        damageTaken: toNonNegativeNumber(ui?.developerTrainingDamageTakenInput?.value, 0),
        itemUses: toInt(ui?.developerTrainingItemUsesInput?.value, 0, 0, 10000),
        crashed: !!ui?.developerTrainingCrashedToggle?.checked,
        stuck: !!ui?.developerTrainingStuckToggle?.checked,
        won: !!ui?.developerTrainingWonToggle?.checked,
        lost: !!ui?.developerTrainingLostToggle?.checked,
    };
}

export function buildDeveloperTrainingResetPayload(ui) {
    return resolveCommonTrainingConfig(ui);
}

export function buildDeveloperTrainingStepPayload(ui) {
    const common = resolveCommonTrainingConfig(ui);
    const done = !!ui?.developerTrainingDoneToggle?.checked;
    const terminalReason = done
        ? toTrimmedString(ui?.developerTrainingTerminalReasonInput?.value, 'external-terminal')
        : null;
    return {
        ...common,
        action: resolveAction(ui),
        rewardSignals: resolveRewardSignals(ui),
        done,
        terminalReason,
    };
}

export function buildDeveloperTrainingAutoStepPayload(ui) {
    return {
        ...buildDeveloperTrainingStepPayload(ui),
        steps: toInt(ui?.developerTrainingAutoStepsInput?.value, 20, 1, 5000),
    };
}
