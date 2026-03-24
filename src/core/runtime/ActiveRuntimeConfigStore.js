import { cloneJsonValue } from '../../shared/utils/JsonClone.js';

let ACTIVE_RUNTIME_CONFIG = null;

function cloneValue(value) {
    return cloneJsonValue(value);
}

function deepFreeze(value) {
    if (!value || typeof value !== 'object') return value;
    Object.freeze(value);
    for (const entry of Object.values(value)) {
        if (entry && typeof entry === 'object' && !Object.isFrozen(entry)) {
            deepFreeze(entry);
        }
    }
    return value;
}

export function setActiveRuntimeConfig(config) {
    ACTIVE_RUNTIME_CONFIG = config && typeof config === 'object'
        ? deepFreeze(cloneValue(config))
        : null;
    return ACTIVE_RUNTIME_CONFIG;
}

export function getActiveRuntimeConfig(fallback = null) {
    if (ACTIVE_RUNTIME_CONFIG && typeof ACTIVE_RUNTIME_CONFIG === 'object') {
        return ACTIVE_RUNTIME_CONFIG;
    }
    return fallback;
}

export function clearActiveRuntimeConfig() {
    ACTIVE_RUNTIME_CONFIG = null;
}
