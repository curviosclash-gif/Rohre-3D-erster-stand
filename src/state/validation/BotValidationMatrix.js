import { getTrainingBenchmarkBotValidationMatrix } from '../training/TrainingBenchmarkContract.js';

function cloneScenario(entry) {
    const normalizedMode = String(entry.gameMode || '').trim().toUpperCase() === 'HUNT' ? 'HUNT' : 'CLASSIC';
    const rawStrategy = String(entry.botPolicyStrategy || '').trim().toLowerCase();
    const strategy = rawStrategy || 'auto';
    return {
        id: String(entry.id || ''),
        mode: entry.mode === '2p' ? '2p' : '1p',
        bots: Math.max(0, Math.trunc(Number(entry.bots) || 0)),
        mapKey: String(entry.mapKey || 'standard'),
        gameMode: normalizedMode,
        botPolicyStrategy: strategy,
        planarMode: !!entry.planarMode,
        portalCount: Math.max(0, Math.trunc(Number(entry.portalCount) || 0)),
        rounds: Math.max(1, Math.trunc(Number(entry.rounds) || 1)),
        expectedPolicyType: String(entry.expectedPolicyType || '').trim().toLowerCase(),
    };
}

export function getBotValidationMatrix() {
    return getTrainingBenchmarkBotValidationMatrix().map((entry) => cloneScenario(entry));
}

export function resolveBotValidationScenario(idOrIndex = 0, matrix = null) {
    const source = Array.isArray(matrix) ? matrix : getBotValidationMatrix();
    if (source.length === 0) return null;

    if (typeof idOrIndex === 'number' && Number.isFinite(idOrIndex)) {
        const idx = Math.max(0, Math.min(source.length - 1, Math.trunc(idOrIndex)));
        return cloneScenario(source[idx]);
    }

    const id = String(idOrIndex || '').trim();
    const byId = source.find((entry) => String(entry.id || '').toUpperCase() === id.toUpperCase());
    return cloneScenario(byId || source[0]);
}
