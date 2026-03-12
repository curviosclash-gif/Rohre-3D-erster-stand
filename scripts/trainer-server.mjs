#!/usr/bin/env node
import process from 'node:process';

import {
    formatTrainerServerHelp,
    resolveTrainerConfig,
} from '../trainer/config/TrainerConfig.mjs';
import {
    readJsonIfExists,
    resolveLatestCheckpointPayload,
} from '../trainer/artifacts/TrainerArtifactStore.mjs';
import { validateDqnCheckpointPayload } from '../trainer/model/CheckpointValidation.mjs';
import { TrainerServer } from '../trainer/server/TrainerServer.mjs';

function hasHelpFlag(argv) {
    return argv.includes('--help') || argv.includes('-h');
}

function parseArgMap(argv = []) {
    const args = new Map();
    for (let i = 0; i < argv.length; i++) {
        const token = String(argv[i] || '');
        if (!token.startsWith('--')) continue;
        const eqIndex = token.indexOf('=');
        if (eqIndex >= 0) {
            args.set(token.slice(2, eqIndex), token.slice(eqIndex + 1));
            continue;
        }
        const key = token.slice(2);
        const next = argv[i + 1];
        if (typeof next === 'string' && !next.startsWith('--')) {
            args.set(key, next);
            i += 1;
            continue;
        }
        args.set(key, 'true');
    }
    return args;
}

function parseBoolean(value, fallback = false) {
    if (typeof value === 'boolean') return value;
    if (typeof value !== 'string') return fallback;
    const normalized = value.trim().toLowerCase();
    if (!normalized) return fallback;
    if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
    if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
    return fallback;
}

async function resolveStartupCheckpoint(args, env) {
    const token = args.get('resume-checkpoint')
        || env.TRAINER_RESUME_CHECKPOINT
        || '';
    const resumeToken = String(token || '').trim();
    if (!resumeToken) {
        return {
            startupCheckpoint: null,
            warning: null,
        };
    }

    const strict = parseBoolean(
        args.get('resume-strict') || env.TRAINER_RESUME_STRICT,
        false
    );
    if (resumeToken.toLowerCase() === 'latest') {
        const resolvedLatest = await resolveLatestCheckpointPayload({
            latestIndexPath: args.get('latest-index-path') || env.TRAINER_LATEST_INDEX_PATH || 'data/training/runs/latest.json',
        });
        if (!resolvedLatest.ok || !resolvedLatest.checkpoint) {
            const warning = `startup-resume-latest failed: ${resolvedLatest.error || 'checkpoint-unavailable'}`;
            if (strict) {
                throw new Error(warning);
            }
            return {
                startupCheckpoint: null,
                warning,
            };
        }
        return {
            startupCheckpoint: {
                checkpoint: resolvedLatest.checkpoint,
                resumeSource: resolvedLatest.checkpointPath || 'latest',
                strict,
            },
            warning: null,
        };
    }

    const rawCheckpoint = await readJsonIfExists(resumeToken);
    const validation = validateDqnCheckpointPayload(rawCheckpoint);
    if (!validation.ok || !validation.checkpoint) {
        const warning = `startup-resume-checkpoint invalid: ${validation.error || 'checkpoint-invalid'}`;
        if (strict) {
            throw new Error(warning);
        }
        return {
            startupCheckpoint: null,
            warning,
        };
    }
    return {
        startupCheckpoint: {
            checkpoint: validation.checkpoint,
            resumeSource: resumeToken,
            strict,
        },
        warning: null,
    };
}

async function main() {
    const argv = process.argv.slice(2);
    if (hasHelpFlag(argv)) {
        console.log(formatTrainerServerHelp());
        return;
    }

    const args = parseArgMap(argv);
    const config = resolveTrainerConfig({
        argv,
        env: process.env,
    });
    const startupCheckpoint = await resolveStartupCheckpoint(args, process.env);
    if (startupCheckpoint.warning) {
        console.warn(`[trainer-server] ${startupCheckpoint.warning}`);
    }
    const server = new TrainerServer({
        ...config,
        startupCheckpoint: startupCheckpoint.startupCheckpoint,
    });

    await server.start();
    const address = server.getAddress();
    const host = address?.host || config.host;
    const port = Number.isInteger(address?.port) ? address.port : config.port;
    console.log(`Trainer server running on ws://${host}:${port}`);

    let shuttingDown = false;
    const shutdown = async () => {
        if (shuttingDown) return;
        shuttingDown = true;
        console.log('Trainer server shutting down...');
        await server.stop();
        const stats = server.getStatsSnapshot();
        if (config.verbose) {
            console.log(JSON.stringify({
                type: 'trainer-server-summary',
                stats,
            }, null, 2));
        }
    };

    process.on('SIGINT', () => {
        void shutdown();
    });
    process.on('SIGTERM', () => {
        void shutdown();
    });
    process.on('beforeExit', () => {
        if (!shuttingDown) {
            void shutdown();
        }
    });
}

main().catch((error) => {
    console.error(error?.stack || String(error));
    process.exitCode = 1;
});
