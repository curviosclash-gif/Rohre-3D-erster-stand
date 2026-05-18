export const LOCAL_MUTATION_APIS_ENV = 'ENABLE_LOCAL_MUTATION_APIS';
export const PREVIEW_LOCAL_MUTATION_DISABLED_ERROR = 'preview-local-mutation-disabled';

const ENABLED_VALUES = new Set(['1', 'true', 'yes', 'on']);

export function isLocalMutationApiEnabled(env = process.env) {
    const raw = env?.[LOCAL_MUTATION_APIS_ENV];
    if (raw === true) return true;
    if (raw === 1) return true;
    return ENABLED_VALUES.has(String(raw || '').trim().toLowerCase());
}

export function shouldBlockPreviewLocalMutation({ isPreviewServer = false, env = process.env } = {}) {
    return isPreviewServer === true && !isLocalMutationApiEnabled(env);
}

export function createPreviewLocalMutationDisabledPayload(extra = {}) {
    return {
        ok: false,
        error: PREVIEW_LOCAL_MUTATION_DISABLED_ERROR,
        ...extra,
    };
}

export function createPreviewLocalMutationDisabledResponse(extra = {}) {
    return {
        statusCode: 403,
        payload: createPreviewLocalMutationDisabledPayload(extra),
    };
}
