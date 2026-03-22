export const RECORDING_CAPTURE_PROFILE = Object.freeze({
    STANDARD: 'standard',
    YOUTUBE_SHORT: 'youtube_short',
});

export const RECORDING_HUD_MODE = Object.freeze({
    CLEAN: 'clean',
    WITH_HUD: 'with_hud',
});

export const DEFAULT_RECORDING_CAPTURE_SETTINGS = Object.freeze({
    profile: RECORDING_CAPTURE_PROFILE.STANDARD,
    hudMode: RECORDING_HUD_MODE.CLEAN,
});

const VALID_PROFILE_SET = new Set(Object.values(RECORDING_CAPTURE_PROFILE));
const VALID_HUD_MODE_SET = new Set(Object.values(RECORDING_HUD_MODE));

function normalizeString(value) {
    return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

export function normalizeRecordingCaptureProfile(value, fallback = DEFAULT_RECORDING_CAPTURE_SETTINGS.profile) {
    const normalizedFallback = VALID_PROFILE_SET.has(fallback)
        ? fallback
        : DEFAULT_RECORDING_CAPTURE_SETTINGS.profile;
    const candidate = normalizeString(value);
    return VALID_PROFILE_SET.has(candidate) ? candidate : normalizedFallback;
}

export function normalizeRecordingHudMode(value, fallback = DEFAULT_RECORDING_CAPTURE_SETTINGS.hudMode) {
    const normalizedFallback = VALID_HUD_MODE_SET.has(fallback)
        ? fallback
        : DEFAULT_RECORDING_CAPTURE_SETTINGS.hudMode;
    const candidate = normalizeString(value);
    return VALID_HUD_MODE_SET.has(candidate) ? candidate : normalizedFallback;
}

export function createDefaultRecordingCaptureSettings() {
    return {
        profile: DEFAULT_RECORDING_CAPTURE_SETTINGS.profile,
        hudMode: DEFAULT_RECORDING_CAPTURE_SETTINGS.hudMode,
    };
}

export function normalizeRecordingCaptureSettings(source, fallback = DEFAULT_RECORDING_CAPTURE_SETTINGS) {
    const src = source && typeof source === 'object' ? source : {};
    const normalizedFallback = fallback && typeof fallback === 'object'
        ? fallback
        : DEFAULT_RECORDING_CAPTURE_SETTINGS;
    return {
        profile: normalizeRecordingCaptureProfile(src.profile, normalizedFallback.profile),
        hudMode: normalizeRecordingHudMode(src.hudMode, normalizedFallback.hudMode),
    };
}
