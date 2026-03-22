import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import test from 'node:test';
import { promisify } from 'node:util';

import { resolveDevLayoutRelativePath } from '../scripts/dev-layout-paths.mjs';

const execFileAsync = promisify(execFile);
const LATEST_INDEX_PATH = 'data/training/runs/latest.json';
const LATEST_LOCK_PATH = 'tmp/test-latest-index.lock';
const TRAINING_RUN_SCRIPT = resolveDevLayoutRelativePath('scripts', 'training-run.mjs');
const TRAINING_EVAL_SCRIPT = resolveDevLayoutRelativePath('scripts', 'training-eval.mjs');
const TRAINING_GATE_SCRIPT = resolveDevLayoutRelativePath('scripts', 'training-gate.mjs');

async function readFileIfExists(filePath) {
    try {
        return await readFile(filePath, 'utf8');
    } catch (error) {
        if (error?.code === 'ENOENT') return null;
        throw error;
    }
}

async function restoreFile(filePath, content) {
    if (content == null) {
        await rm(filePath, { force: true });
        return;
    }
    await writeFile(filePath, content, 'utf8');
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function acquireLatestIndexLock(timeoutMs = 10000) {
    const startedAt = Date.now();
    while ((Date.now() - startedAt) < timeoutMs) {
        try {
            await mkdir(LATEST_LOCK_PATH);
            return async () => {
                await rm(LATEST_LOCK_PATH, { recursive: true, force: true });
            };
        } catch (error) {
            if (error?.code !== 'EEXIST') throw error;
            await sleep(50);
        }
    }
    throw new Error(`latest-index lock timeout after ${timeoutMs}ms`);
}

function parseLastJsonObject(stdout) {
    const source = String(stdout || '');
    const marker = '\n{\n  "ok"';
    const markerIndex = source.lastIndexOf(marker);
    const startIndex = markerIndex >= 0 ? markerIndex + 1 : source.indexOf('{');
    return JSON.parse(source.slice(startIndex));
}

async function writeFailingBotValidationReport(filePath) {
    await writeFile(filePath, `${JSON.stringify({
        overall: {
            rounds: 16,
            botWinRate: 0.05,
            averageBotSurvival: 8,
        },
        runner: {
            forcedRounds: 14,
            timeoutRounds: 14,
        },
    }, null, 2)}\n`, 'utf8');
}

test('V36 training gate restores latest index after standalone eval+gate failure', async () => {
    const releaseLock = await acquireLatestIndexLock();
    const stamp = `TEST_GATE_RESTORE_${Date.now()}`;
    const reportPath = `data/training/test-bot-validation-fail-${stamp}.json`;
    const latestBefore = await readFileIfExists(LATEST_INDEX_PATH);
    try {
        await writeFailingBotValidationReport(reportPath);
        await execFileAsync(process.execPath, [
            TRAINING_RUN_SCRIPT,
            '--stamp', stamp,
            '--write-latest', 'true',
            '--bridge-mode', 'local',
            '--resume-checkpoint', 'latest',
            '--resume-strict', 'false',
            '--episodes', '1',
            '--seeds', '11',
            '--modes', 'classic-3d',
            '--max-steps', '8',
        ]);
        await execFileAsync(process.execPath, [
            TRAINING_EVAL_SCRIPT,
            '--stamp', stamp,
            '--write-latest', 'true',
            '--bot-validation-report', reportPath,
        ]);

        let stdout = '';
        try {
            await execFileAsync(process.execPath, [
                TRAINING_GATE_SCRIPT,
                '--stamp', stamp,
                '--write-latest', 'true',
            ]);
            assert.fail('training-gate should fail when bot validation metrics breach hard limits');
        } catch (error) {
            stdout = String(error?.stdout || '');
        }

        const result = parseLastJsonObject(stdout);
        const latestAfter = await readFileIfExists(LATEST_INDEX_PATH);
        assert.equal(result.ok, false);
        assert.equal(result.latestRestored, true);
        assert.equal(latestAfter, latestBefore);
    } finally {
        await restoreFile(reportPath, null);
        await restoreFile(LATEST_INDEX_PATH, latestBefore);
        await releaseLock();
    }
});

