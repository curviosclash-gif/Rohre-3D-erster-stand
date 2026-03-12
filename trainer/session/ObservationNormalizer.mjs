function toFinite(value, fallback = 0) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : fallback;
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

export function normalizeObservationVector(observation, options = {}) {
    const length = Math.max(1, Math.trunc(Number(options.length) || 40));
    const clampAbs = Math.max(1, Math.trunc(Number(options.clampAbs) || 10_000));
    const source = Array.isArray(observation) ? observation : [];
    const normalized = new Array(length);
    for (let i = 0; i < length; i++) {
        const raw = toFinite(source[i], 0);
        normalized[i] = clamp(raw, -clampAbs, clampAbs);
    }
    return normalized;
}
