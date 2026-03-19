import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import test from 'node:test';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const LATEST_INDEX_PATH = 'data/training/runs/latest.json';
const LATEST_LOCK_PATH = 'tmp/test-latest-index.lock';

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

test('V36 training e2e records skipped bot-validation refresh when latest writes are disabled', async () => {
    const releaseLock = await acquireLatestIndexLock();
    const stamp = `TEST_E2E_BOT_VALIDATE_SKIP_${Date.now()}`;
    const latestBefore = await readFileIfExists(LATEST_INDEX_PATH);
    try {
        const { stdout } = await execFileAsync(process.execPath, [
            'scripts/training-e2e.mjs',
            '--stamp', stamp,
            '--with-trainer-server', 'false',
            '--write-latest', 'false',
            '--refresh-bot-validation', 'true',
            '--bridge-mode', 'local',
            '--resume-checkpoint', 'latest',
            '--resume-strict', 'false',
            '--episodes', '1',
            '--seeds', '7',
            '--modes', 'classic-3d',
            '--max-steps', '8',
        ]);

        const result = parseLastJsonObject(stdout);
        const stage = result.stageResults?.find((entry) => entry.stage === 'bot-validation');
        const latestAfter = await readFileIfExists(LATEST_INDEX_PATH);
        assert.equal(result.ok, true);
        assert.equal(stage?.status, 'skipped');
        assert.match(String(stage?.reason || ''), /write-latest false/i);
        assert.match(String(result.botValidation?.reportPath || ''), new RegExp(`${stamp}[/\\\\]bot-validation-report\\.json$`));
        assert.equal(result.botValidation?.promotedReportPath, null);
        assert.equal(latestAfter, latestBefore);
    } finally {
        await restoreFile(LATEST_INDEX_PATH, latestBefore);
        await releaseLock();
    }
});

test('V36 training e2e restores latest index after failing gate', async () => {
    const releaseLock = await acquireLatestIndexLock();
    const stamp = `TEST_E2E_GATE_RESTORE_${Date.now()}`;
    const reportPath = `data/training/test-bot-validation-fail-${stamp}.json`;
    const latestBefore = await readFileIfExists(LATEST_INDEX_PATH);
    try {
        await writeFailingBotValidationReport(reportPath);
        let stdout = '';
        try {
            await execFileAsync(process.execPath, [
                'scripts/training-e2e.mjs',
                '--stamp', stamp,
                '--with-trainer-server', 'false',
                '--write-latest', 'true',
                '--bridge-mode', 'local',
                '--resume-checkpoint', 'latest',
                '--resume-strict', 'false',
                '--episodes', '1',
                '--seeds', '7',
                '--modes', 'classic-3d',
                '--max-steps', '8',
                '--bot-validation-report', reportPath,
            ]);
            assert.fail('training-e2e should fail when gate rejects bot validation metrics');
        } catch (error) {
            stdout = String(error?.stdout || '');
        }

        const result = parseLastJsonObject(stdout);
        const latestAfter = await readFileIfExists(LATEST_INDEX_PATH);
        const gateStage = result.stageResults?.find((entry) => entry.stage === 'gate');
        assert.equal(result.ok, false);
        assert.equal(result.latestRestored, true);
        assert.equal(gateStage?.status, 'failed');
        assert.equal(latestAfter, latestBefore);
    } finally {
        await restoreFile(reportPath, null);
        await restoreFile(LATEST_INDEX_PATH, latestBefore);
        await releaseLock();
    }
});

