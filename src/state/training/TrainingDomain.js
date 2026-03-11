// ============================================
// TrainingDomain.js - deterministic domain mapping via mode + planarMode
// ============================================

export const TRAINING_DOMAIN_VERSION = 'mode-planar-v1';

const MODE_ALIASES = Object.freeze({
    classic: 'classic',
    normal: 'classic',
    hunt: 'hunt',
    fight: 'hunt',
});

function normalizeModeValue(mode) {
    if (typeof mode !== 'string') return 'classic';
    const normalized = mode.trim().toLowerCase();
    return MODE_ALIASES[normalized] || 'classic';
}

export function normalizeTrainingMode(mode) {
    return normalizeModeValue(mode);
}

export function deriveTrainingDomain(input = {}) {
    const payload = input && typeof input === 'object'
        ? input
        : { mode: input };
    const mode = normalizeModeValue(payload.mode);
    const planarMode = !!payload.planarMode;
    const dimension = planarMode ? '2d' : '3d';
    const domain = {
        version: TRAINING_DOMAIN_VERSION,
        mode,
        planarMode,
        dimension,
        domainId: `${mode}-${dimension}`,
    };

    if (typeof payload.matchBotType === 'string' && payload.matchBotType.trim()) {
        domain.matchBotType = payload.matchBotType.trim();
    }
    return domain;
}
