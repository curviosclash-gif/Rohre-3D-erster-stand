const ALLOWED_TRAINING_MODES = new Set([
    'classic-3d',
    'classic-2d',
    'hunt-3d',
    'hunt-2d',
]);

const POSITIVE_INT_FIELDS = new Set(['episodes', 'maxSteps']);

export function parsePositiveInteger(value, { fieldName, defaultValue = null, min = 1, max = 100000 } = {}) {
    if (value === undefined || value === null || value === '') return defaultValue;
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
        throw new TypeError(`${fieldName || 'value'} must be an integer between ${min} and ${max}.`);
    }
    return parsed;
}

export function parseTrainingModes(value) {
    if (value === undefined || value === null || value === '') return [];
    const modes = String(value)
        .split(',')
        .map((mode) => mode.trim())
        .filter(Boolean);

    if (modes.length === 0) return [];

    const invalidModes = modes.filter((mode) => !ALLOWED_TRAINING_MODES.has(mode));
    if (invalidModes.length > 0) {
        throw new TypeError(`Unsupported training mode: ${invalidModes.join(', ')}`);
    }

    return [...new Set(modes)];
}

export function parseTrainingSeeds(value) {
    if (value === undefined || value === null || value === '') return [];
    const seeds = String(value)
        .split(',')
        .map((seed) => seed.trim())
        .filter(Boolean);

    if (seeds.length === 0) return [];

    for (const seed of seeds) {
        if (!/^\d+$/.test(seed)) {
            throw new TypeError('Seeds must be comma-separated non-negative integers.');
        }
    }

    return seeds;
}

export function parseResumeCheckpoint(value) {
    if (value === undefined || value === null || value === '') return null;
    const checkpoint = String(value).trim();
    if (checkpoint === 'latest') return checkpoint;
    if (/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}$/.test(checkpoint)) return checkpoint;
    throw new TypeError('resumeCheckpoint must be "latest" or a safe checkpoint id.');
}

export function buildTrainingCliArgs(config = {}) {
    const source = config && typeof config === 'object' ? config : {};
    const args = [];

    for (const fieldName of POSITIVE_INT_FIELDS) {
        const parsed = parsePositiveInteger(source[fieldName], {
            fieldName,
            defaultValue: null,
            min: 1,
            max: fieldName === 'episodes' ? 100000 : 1000000,
        });
        if (parsed !== null) {
            args.push(fieldName === 'maxSteps' ? '--max-steps' : `--${fieldName}`, String(parsed));
        }
    }

    const modes = parseTrainingModes(source.modes);
    if (modes.length > 0) args.push('--modes', modes.join(','));

    const seeds = parseTrainingSeeds(source.seed ?? source.seeds);
    if (seeds.length > 0) args.push('--seeds', seeds.join(','));

    const resumeCheckpoint = parseResumeCheckpoint(source.resumeCheckpoint);
    if (resumeCheckpoint) args.push('--resume-checkpoint', resumeCheckpoint);

    return args;
}

export function resolveNpmCommand(platform = process.platform) {
    return platform === 'win32' ? 'npm.cmd' : 'npm';
}

export function buildTrainingSpawnCommand(config = {}, { platform = process.platform } = {}) {
    const cliArgs = buildTrainingCliArgs(config);
    const args = ['run', 'training:e2e'];
    if (cliArgs.length > 0) args.push('--', ...cliArgs);
    return {
        command: resolveNpmCommand(platform),
        args,
        shell: false,
    };
}
