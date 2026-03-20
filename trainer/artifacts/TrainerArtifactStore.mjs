import { readFileSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

function toRepoPath(path) {
    return String(path || '').replace(/\\/g, '/');
}

export function resolveTrainerArtifactPaths(stamp) {
    const safeStamp = String(stamp || '').trim() || 'UNKNOWN_STAMP';
    const runsRoot = 'data/training/runs';
    const modelsRoot = 'data/training/models';
    const runDir = `${runsRoot}/${safeStamp}`;
    const modelDir = `${modelsRoot}/${safeStamp}`;
    return {
        stamp: safeStamp,
        runsRoot,
        modelsRoot,
        runDir,
        modelDir,
        trainerArtifactPath: `${runDir}/trainer.json`,
        checkpointPath: `${modelDir}/checkpoint.json`,
        latestIndexPath: `${runsRoot}/latest.json`,
    };
}

async function writeJson(path, payload) {
    await mkdir(path.replace(/[\\/][^\\/]+$/, ''), { recursive: true });
    await writeFile(path, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

export async function readJsonIfExists(path) {
    try {
        const raw = await readFile(path, 'utf8');
        return JSON.parse(raw);
    } catch (error) {
        if (error?.code === 'ENOENT') return null;
        throw error;
    }
}

export function readJsonIfExistsSync(path) {
    try {
        const raw = readFileSync(path, 'utf8');
        return JSON.parse(raw);
    } catch (error) {
        if (error?.code === 'ENOENT') return null;
        throw error;
    }
}

const CHECKPOINT_CONTRACT_VERSIONS = new Set([
    'v35-dqn-checkpoint-v1',
    'v34-dqn-checkpoint-v1',
]);

function extractCheckpointPayload(raw) {
    if (!raw || typeof raw !== 'object') return null;
    if (raw.checkpoint && typeof raw.checkpoint === 'object') {
        return raw.checkpoint;
    }
    if (CHECKPOINT_CONTRACT_VERSIONS.has(raw.contractVersion)) {
        return raw;
    }
    return null;
}

export async function resolveLatestCheckpointPath(latestIndexPath = 'data/training/runs/latest.json') {
    const latestIndex = await readJsonIfExists(latestIndexPath);
    const checkpointPath = latestIndex?.artifacts?.checkpoint?.path
        || latestIndex?.checkpointPath
        || null;
    if (typeof checkpointPath !== 'string' || !checkpointPath.trim()) {
        return null;
    }
    return toRepoPath(checkpointPath.trim());
}

export function resolveLatestCheckpointPathSync(latestIndexPath = 'data/training/runs/latest.json') {
    const latestIndex = readJsonIfExistsSync(latestIndexPath);
    const checkpointPath = latestIndex?.artifacts?.checkpoint?.path
        || latestIndex?.checkpointPath
        || null;
    if (typeof checkpointPath !== 'string' || !checkpointPath.trim()) {
        return null;
    }
    return toRepoPath(checkpointPath.trim());
}

export async function resolveLatestCheckpointPayload(options = {}) {
    const latestIndexPath = typeof options.latestIndexPath === 'string' && options.latestIndexPath.trim()
        ? options.latestIndexPath.trim()
        : 'data/training/runs/latest.json';
    const checkpointPath = typeof options.checkpointPath === 'string' && options.checkpointPath.trim()
        ? options.checkpointPath.trim()
        : await resolveLatestCheckpointPath(latestIndexPath);
    if (!checkpointPath) {
        return {
            ok: false,
            checkpointPath: null,
            checkpoint: null,
            error: 'checkpoint-path-missing',
        };
    }
    const checkpointRaw = await readJsonIfExists(checkpointPath);
    const checkpoint = extractCheckpointPayload(checkpointRaw);
    if (!checkpoint) {
        return {
            ok: false,
            checkpointPath: toRepoPath(checkpointPath),
            checkpoint: null,
            error: 'checkpoint-payload-missing',
        };
    }
    return {
        ok: true,
        checkpointPath: toRepoPath(checkpointPath),
        checkpoint,
        error: null,
    };
}

export function resolveLatestCheckpointPayloadSync(options = {}) {
    const latestIndexPath = typeof options.latestIndexPath === 'string' && options.latestIndexPath.trim()
        ? options.latestIndexPath.trim()
        : 'data/training/runs/latest.json';
    const checkpointPath = typeof options.checkpointPath === 'string' && options.checkpointPath.trim()
        ? options.checkpointPath.trim()
        : resolveLatestCheckpointPathSync(latestIndexPath);
    if (!checkpointPath) {
        return {
            ok: false,
            checkpointPath: null,
            checkpoint: null,
            error: 'checkpoint-path-missing',
        };
    }
    const checkpointRaw = readJsonIfExistsSync(checkpointPath);
    const checkpoint = extractCheckpointPayload(checkpointRaw);
    if (!checkpoint) {
        return {
            ok: false,
            checkpointPath: toRepoPath(checkpointPath),
            checkpoint: null,
            error: 'checkpoint-payload-missing',
        };
    }
    return {
        ok: true,
        checkpointPath: toRepoPath(checkpointPath),
        checkpoint,
        error: null,
    };
}

export async function writeTrainerArtifacts(input = {}) {
    const paths = resolveTrainerArtifactPaths(input.stamp);
    const checkpoint = input.checkpoint && typeof input.checkpoint === 'object'
        ? input.checkpoint
        : null;
    const trainerArtifact = {
        contractVersion: 'v35-trainer-artifact-v1',
        generatedAt: typeof input.generatedAt === 'string' ? input.generatedAt : new Date().toISOString(),
        stamp: paths.stamp,
        checkpointPath: checkpoint ? toRepoPath(paths.checkpointPath) : null,
        resumeSource: input.resumeSource || null,
        trainer: input.trainer || null,
        bridge: input.bridge || null,
        opsKpis: input.opsKpis || null,
        runSummary: input.runSummary || null,
    };
    const checkpointArtifact = {
        contractVersion: 'v35-checkpoint-artifact-v1',
        generatedAt: trainerArtifact.generatedAt,
        stamp: paths.stamp,
        resumeSource: input.resumeSource || null,
        checkpoint,
    };

    await writeJson(paths.trainerArtifactPath, trainerArtifact);
    if (checkpoint) {
        await writeJson(paths.checkpointPath, checkpointArtifact);
    }
    return {
        trainerArtifactPath: paths.trainerArtifactPath,
        checkpointPath: checkpoint ? paths.checkpointPath : null,
        trainerArtifact,
        checkpointArtifact: checkpoint ? checkpointArtifact : null,
    };
}
