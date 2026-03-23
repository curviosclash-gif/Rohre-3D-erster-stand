export const CAMERA_PERSPECTIVE_MODE = Object.freeze({
    CLASSIC: 'classic',
    CINEMATIC_SOFT: 'cinematic_soft',
    CINEMATIC_ACTION: 'cinematic_action',
});

export const DEFAULT_CAMERA_PERSPECTIVE_SETTINGS = Object.freeze({
    normal: CAMERA_PERSPECTIVE_MODE.CLASSIC,
    reduceMotion: true,
});

const VALID_CAMERA_PERSPECTIVE_MODE_SET = new Set(Object.values(CAMERA_PERSPECTIVE_MODE));

function normalizeString(value) {
    return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

export function normalizeCameraPerspectiveMode(value, fallback = DEFAULT_CAMERA_PERSPECTIVE_SETTINGS.normal) {
    const normalizedFallback = VALID_CAMERA_PERSPECTIVE_MODE_SET.has(fallback)
        ? fallback
        : DEFAULT_CAMERA_PERSPECTIVE_SETTINGS.normal;
    const candidate = normalizeString(value);
    return VALID_CAMERA_PERSPECTIVE_MODE_SET.has(candidate) ? candidate : normalizedFallback;
}

export function createDefaultCameraPerspectiveSettings() {
    return {
        normal: DEFAULT_CAMERA_PERSPECTIVE_SETTINGS.normal,
        reduceMotion: DEFAULT_CAMERA_PERSPECTIVE_SETTINGS.reduceMotion,
    };
}

export function normalizeCameraPerspectiveSettings(source, fallback = DEFAULT_CAMERA_PERSPECTIVE_SETTINGS) {
    const src = source && typeof source === 'object' ? source : {};
    const normalizedFallback = fallback && typeof fallback === 'object'
        ? fallback
        : DEFAULT_CAMERA_PERSPECTIVE_SETTINGS;
    return {
        normal: normalizeCameraPerspectiveMode(src.normal, normalizedFallback.normal),
        reduceMotion: typeof src.reduceMotion === 'boolean'
            ? src.reduceMotion
            : !!normalizedFallback.reduceMotion,
    };
}
