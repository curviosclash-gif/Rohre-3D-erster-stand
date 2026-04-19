import { SETTINGS_LIMITS } from '../config/SettingsRuntimeContract.js';
import { validateSettingsOverrideDraft } from './SettingsOverrideContract.js';
import {
    deepCloneJson,
    isPlainObject,
    readPathValue,
    writePathValue,
} from './SettingsOverrideMergeOps.js';

function toRuntimeLimitPath(overridePath) {
    const normalizedPath = String(overridePath || '').trim();
    if (!normalizedPath.startsWith('baseSettings.')) return null;

    const runtimePath = normalizedPath.slice('baseSettings.'.length);
    if (runtimePath === 'numBots') return 'session.numBots';
    if (runtimePath === 'winsNeeded') return 'session.winsNeeded';
    if (runtimePath.startsWith('gameplay.')) return runtimePath;
    if (runtimePath.startsWith('botBridge.')) return runtimePath;
    return null;
}

function mergeLimitRule(baseRule, overrideRule) {
    const base = isPlainObject(baseRule) ? baseRule : {};
    const override = isPlainObject(overrideRule) ? overrideRule : {};
    const merged = { ...base };

    if (Number.isFinite(Number(override.min))) {
        merged.min = Number(override.min);
    }
    if (Number.isFinite(Number(override.max))) {
        merged.max = Number(override.max);
    }
    if (Number.isFinite(Number(override.step)) && Number(override.step) > 0) {
        merged.step = Number(override.step);
    }
    if (typeof override.integer === 'boolean') {
        merged.integer = override.integer;
    }

    return merged;
}

export function readSettingsOverrideDraftFromRuntime(runtimeGlobal = globalThis) {
    const root = runtimeGlobal && typeof runtimeGlobal === 'object'
        ? runtimeGlobal
        : (typeof globalThis !== 'undefined' ? globalThis : {});
    const settingsDefaultsContract = root?.curviosApp?.settingsDefaults
        || root?.curviosApp?.contracts?.settingsDefaults;
    if (!settingsDefaultsContract || typeof settingsDefaultsContract.getOverrideSnapshot !== 'function') {
        return null;
    }

    try {
        const snapshot = settingsDefaultsContract.getOverrideSnapshot();
        return isPlainObject(snapshot?.draft) ? snapshot.draft : null;
    } catch {
        return null;
    }
}

export function createRuntimeSettingsLimitsWithOverride(rawOverrideDraft) {
    const runtimeLimits = deepCloneJson(SETTINGS_LIMITS);
    if (!isPlainObject(rawOverrideDraft)) {
        return runtimeLimits;
    }

    const result = validateSettingsOverrideDraft(rawOverrideDraft);
    if (!result.valid || !isPlainObject(result.normalizedDraft?.limitOverrides)) {
        return runtimeLimits;
    }

    for (const [overridePath, overrideRule] of Object.entries(result.normalizedDraft.limitOverrides)) {
        const runtimePath = toRuntimeLimitPath(overridePath);
        if (!runtimePath) continue;

        const baseRule = readPathValue(runtimeLimits, runtimePath);
        writePathValue(runtimeLimits, runtimePath, mergeLimitRule(baseRule, overrideRule));
    }

    return runtimeLimits;
}

export function createRuntimeSettingsLimitsForRuntime(runtimeGlobal = globalThis) {
    return createRuntimeSettingsLimitsWithOverride(
        readSettingsOverrideDraftFromRuntime(runtimeGlobal)
    );
}
