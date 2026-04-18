import { CONFIG } from '../Config.js';
import {
    createMenuSettingsDefaults,
    ensureMenuContractState,
} from '../../composition/core-ui/CoreSettingsPorts.js';
import {
    BOT_POLICY_STRATEGIES,
} from '../RuntimeConfig.js';
import { resolveActiveGameMode } from '../../hunt/HuntMode.js';
import { createControlBindingsSnapshot } from '../config/SettingsRuntimeContract.js';
import {
    createDefaultRecordingCaptureSettings,
    normalizeRecordingCaptureSettings,
} from '../../shared/contracts/RecordingCaptureContract.js';
import {
    createDefaultCameraPerspectiveSettings,
    normalizeCameraPerspectiveSettings,
} from '../../shared/contracts/CameraPerspectiveContract.js';
import { deepClone } from './SettingsDomainUtils.js';
import { validateSettingsOverrideDraft } from './SettingsOverrideContract.js';
import { deepMergeKnownShape, isPlainObject } from './SettingsOverrideMergeOps.js';

export function cloneDefaultControlsSnapshot() {
    const base = deepClone(CONFIG.KEYS);
    return createControlBindingsSnapshot(base, base);
}

export function createDefaultSettingsSnapshot() {
    const defaults = createMenuSettingsDefaults();
    defaults.gameMode = resolveActiveGameMode(defaults.gameMode, CONFIG.HUNT?.ENABLED !== false);
    defaults.botPolicyStrategy = defaults.botPolicyStrategy || BOT_POLICY_STRATEGIES.AUTO;
    defaults.recording = normalizeRecordingCaptureSettings(
        defaults.recording,
        createDefaultRecordingCaptureSettings()
    );
    defaults.cameraPerspective = normalizeCameraPerspectiveSettings(
        defaults.cameraPerspective,
        createDefaultCameraPerspectiveSettings()
    );
    defaults.controls = cloneDefaultControlsSnapshot();
    return ensureMenuContractState(defaults);
}

export function applySettingsOverrideToDefaults(baseSettings, validatedOverrideDraft) {
    if (!isPlainObject(validatedOverrideDraft) || !isPlainObject(validatedOverrideDraft.baseSettings)) {
        return baseSettings;
    }
    return deepMergeKnownShape(baseSettings, validatedOverrideDraft.baseSettings);
}

export function createDefaultSettingsSnapshotWithOverride(rawOverrideDraft) {
    const base = createDefaultSettingsSnapshot();
    if (!isPlainObject(rawOverrideDraft)) {
        return base;
    }
    const result = validateSettingsOverrideDraft(rawOverrideDraft);
    if (!result.valid) {
        base.__overrideSkipped = true;
        base.__overrideSkippedReason = result.errors.map((e) => e.code).join(', ');
        return base;
    }
    return applySettingsOverrideToDefaults(base, result.normalizedDraft);
}
