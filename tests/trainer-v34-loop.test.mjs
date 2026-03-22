import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { readFile, rm, writeFile } from 'node:fs/promises';
import test from 'node:test';
import { promisify } from 'node:util';

import { resolveDevLayoutRelativePath } from '../scripts/dev-layout-paths.mjs';

const execFileAsync = promisify(execFile);
const LATEST_INDEX_PATH = 'data/training/runs/latest.json';
const TRAINING_LOOP_SCRIPT = resolveDevLayoutRelativePath('scripts', 'training-loop.mjs');

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

test('V36 training loop orchestrates multi-run series with reproducible summary output', async () => {
    const seriesStamp = `TEST_LOOP_${Date.now()}`;
    const latestBefore = await readFileIfExists(LATEST_INDEX_PATH);
    try {
        await execFileAsync(process.execPath, [
            TRAINING_LOOP_SCRIPT,
            '--series-stamp', seriesStamp,
            '--runs', '2',
            '--with-trainer-server', 'false',
            '--write-latest', 'false',
            '--bridge-mode', 'local',
            '--resume-checkpoint', 'latest',
            '--resume-strict', 'false',
            '--episodes', '1',
            '--seeds', '3',
            '--modes', 'classic-3d',
            '--max-steps', '8',
        ]);

        const artifactRaw = await readFile(`data/training/series/${seriesStamp}/loop.json`, 'utf8');
        const artifact = JSON.parse(artifactRaw);
        const latestAfter = await readFileIfExists(LATEST_INDEX_PATH);
        assert.equal(artifact.ok, true);
        assert.equal(artifact.summary.runsExecuted, 2);
        assert.equal(Array.isArray(artifact.runs), true);
        assert.equal(artifact.runs.length, 2);
        assert.equal(latestAfter, latestBefore);
    } finally {
        await restoreFile(LATEST_INDEX_PATH, latestBefore);
    }
});

test('V36 training loop forwards long-run timeout flags to training-run', async () => {
    const seriesStamp = `TEST_LOOP_TIMEOUT_${Date.now()}`;
    const latestBefore = await readFileIfExists(LATEST_INDEX_PATH);
    try {
        await execFileAsync(process.execPath, [
            TRAINING_LOOP_SCRIPT,
            '--series-stamp', seriesStamp,
            '--runs', '1',
            '--with-trainer-server', 'false',
            '--write-latest', 'false',
            '--bridge-mode', 'local',
            '--resume-checkpoint', 'latest',
            '--resume-strict', 'false',
            '--episodes', '1',
            '--seeds', '3',
            '--modes', 'classic-3d',
            '--max-steps', '8',
            '--timeout-run-ms', '123456',
            '--timeout-episode-ms', '23456',
            '--timeout-step-ms', '345',
        ]);

        const runRaw = await readFile(`data/training/runs/${seriesStamp}-r01/run.json`, 'utf8');
        const runArtifact = JSON.parse(runRaw);
        const latestAfter = await readFileIfExists(LATEST_INDEX_PATH);
        assert.equal(runArtifact.summary.config.timeouts.runMs, 123456);
        assert.equal(runArtifact.summary.config.timeouts.episodeMs, 23456);
        assert.equal(runArtifact.summary.config.timeouts.stepMs, 345);
        assert.equal(latestAfter, latestBefore);
    } finally {
        await restoreFile(LATEST_INDEX_PATH, latestBefore);
    }
});

test('V50 training loop stops once duration budget is reached', async () => {
    const seriesStamp = `TEST_LOOP_DURATION_${Date.now()}`;
    const latestBefore = await readFileIfExists(LATEST_INDEX_PATH);
    try {
        await execFileAsync(process.execPath, [
            TRAINING_LOOP_SCRIPT,
            '--series-stamp', seriesStamp,
            '--runs', '5',
            '--duration-ms', '1',
            '--with-trainer-server', 'false',
            '--write-latest', 'false',
            '--bridge-mode', 'local',
            '--resume-checkpoint', 'latest',
            '--resume-strict', 'false',
            '--episodes', '1',
            '--seeds', '3',
            '--modes', 'classic-3d',
            '--max-steps', '8',
        ]);

        const artifactRaw = await readFile(`data/training/series/${seriesStamp}/loop.json`, 'utf8');
        const artifact = JSON.parse(artifactRaw);
        const latestAfter = await readFileIfExists(LATEST_INDEX_PATH);
        assert.equal(artifact.ok, true);
        assert.equal(artifact.durationBudgetMs, 1);
        assert.equal(artifact.stopReason, 'duration-budget-reached');
        assert.equal(artifact.summary.durationBudgetMs, 1);
        assert.equal(artifact.summary.stopReason, 'duration-budget-reached');
        assert.equal(artifact.summary.durationBudgetReached, true);
        assert.equal(artifact.summary.runsExecuted, 1);
        assert.equal(latestAfter, latestBefore);
    } finally {
        await restoreFile(LATEST_INDEX_PATH, latestBefore);
    }
});
