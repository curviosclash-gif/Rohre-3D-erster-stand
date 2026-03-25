// ============================================
// MediaRecorderSupport.js - shared recorder support helpers/config
// ============================================

export const DEFAULT_MIME_TYPE = 'video/mp4';
export const DEFAULT_FALLBACK_MIME_TYPE = 'video/webm';
const MEDIA_RECORDER_MIME_CANDIDATES = Object.freeze([
    'video/mp4;codecs=avc1.4d002a',
    'video/mp4;codecs=avc1.42E01E',
    'video/mp4',
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
]);

export const RECORDER_ENGINE = Object.freeze({
    NATIVE_WEBCODECS: 'webcodecs-native',
    NATIVE_MEDIARECORDER: 'mediarecorder-native',
    NONE: 'none',
});

export function toSafeDatePart(value) {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) {
        return 'invalid-date';
    }
    const iso = date.toISOString();
    return iso.replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
}

export function sanitizeFileToken(value, fallback = 'match') {
    const normalized = String(value || '').trim().toLowerCase();
    const cleaned = normalized.replace(/[^a-z0-9-_]+/g, '-').replace(/^-+|-+$/g, '');
    return cleaned || fallback;
}

export function resolveGlobalScope(explicitScope = null) {
    if (explicitScope && typeof explicitScope === 'object') {
        return explicitScope;
    }
    if (typeof window !== 'undefined') {
        return window;
    }
    if (typeof globalThis !== 'undefined') {
        return globalThis;
    }
    return {};
}

export function resolvePerfNow(globalScope) {
    const scope = resolveGlobalScope(globalScope);
    const perfNow = scope?.performance?.now;
    if (typeof perfNow === 'function') {
        return () => perfNow.call(scope.performance);
    }
    return () => Date.now();
}

function resolveMediaRecorderMimeType(globalScope) {
    const scope = resolveGlobalScope(globalScope);
    const MediaRecorderCtor = scope?.MediaRecorder;
    if (typeof MediaRecorderCtor !== 'function') return null;
    const supportsTypeProbe = typeof MediaRecorderCtor.isTypeSupported === 'function';
    if (!supportsTypeProbe) {
        return MEDIA_RECORDER_MIME_CANDIDATES[MEDIA_RECORDER_MIME_CANDIDATES.length - 1];
    }

    for (const mimeType of MEDIA_RECORDER_MIME_CANDIDATES) {
        try {
            if (MediaRecorderCtor.isTypeSupported(mimeType)) {
                return mimeType;
            }
        } catch {
            // Ignore broken MIME probes and continue with next candidate.
        }
    }
    return null;
}

function isMediaRecorderMimeTypeSupported(globalScope, mimeType) {
    const normalizedMimeType = String(mimeType || '').trim();
    if (!normalizedMimeType) return false;

    const scope = resolveGlobalScope(globalScope);
    const MediaRecorderCtor = scope?.MediaRecorder;
    if (typeof MediaRecorderCtor !== 'function') return false;
    if (typeof MediaRecorderCtor.isTypeSupported !== 'function') return false;

    try {
        return MediaRecorderCtor.isTypeSupported(normalizedMimeType);
    } catch {
        return false;
    }
}

export function resolveSafeMediaRecorderMimeType(globalScope, preferredMimeType = '') {
    const preferred = String(preferredMimeType || '').trim();
    if (preferred && isMediaRecorderMimeTypeSupported(globalScope, preferred)) {
        return preferred;
    }
    return resolveMediaRecorderMimeType(globalScope) || '';
}

export function detectNativeRecorderSupport(globalScope, canvas = null) {
    const scope = resolveGlobalScope(globalScope);
    const encoderCtor = scope?.VideoEncoder;
    const frameCtor = scope?.VideoFrame;
    const mediaRecorderCtor = scope?.MediaRecorder;
    const canCaptureStream = !!canvas && typeof canvas.captureStream === 'function';
    const hasEncoderCtor = typeof encoderCtor === 'function';
    const hasFrameCtor = typeof frameCtor === 'function';
    const hasNativeProbe = hasEncoderCtor && typeof encoderCtor.isConfigSupported === 'function';
    const hasWebCodecs = hasEncoderCtor && hasFrameCtor && hasNativeProbe;
    const hasMediaRecorder = typeof mediaRecorderCtor === 'function' && canCaptureStream;
    const hasRecorder = hasWebCodecs || hasMediaRecorder;
    const mediaRecorderMimeType = hasMediaRecorder ? resolveMediaRecorderMimeType(scope) : null;
    const selectedMimeType = hasWebCodecs
        ? DEFAULT_MIME_TYPE
        : (mediaRecorderMimeType || DEFAULT_FALLBACK_MIME_TYPE);

    return {
        hasRecorder,
        hasWebCodecs,
        hasMediaRecorder,
        mediaRecorderMimeType,
        selectedMimeType,
        recorderEngine: hasWebCodecs
            ? RECORDER_ENGINE.NATIVE_WEBCODECS
            : (hasMediaRecorder ? RECORDER_ENGINE.NATIVE_MEDIARECORDER : RECORDER_ENGINE.NONE),
        supportReason: hasWebCodecs
            ? 'native-webcodecs'
            : (hasMediaRecorder ? 'native-mediarecorder' : 'missing-native-recorders'),
    };
}
