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

async function writePassingBotValidationReportWithoutDiagnostics(filePath) {
    await writeFile(filePath, `${JSON.stringify({
        overall: {
            rounds: 16,
            botWinRate: 0.75,
            averageBotSurvival: 48,
        },
        runner: {
            forcedRounds: 0,
            timeoutRounds: 0,
            serverMode: 'preview',
            publishEvidence: true,
            previewBuildBeforeStart: true,
        },
    }, null, 2)}\n`, 'utf8');
}

async function writePassingBotValidationReportWithIncompletePreviewPublishEvidence(filePath) {
    await writeFile(filePath, `${JSON.stringify({
        overall: {
            rounds: 16,
            botWinRate: 0.75,
            averageBotSurvival: 48,
        },
        runner: {
            forcedRounds: 0,
            timeoutRounds: 0,
            serverMode: 'preview',
            publishEvidence: true,
            previewBuildBeforeStart: true,
            diagnostics: {
                contractVersion: 'v80-bot-validation-runtime-v1',
                stageTimingsMs: {
                    serverProbeMs: 4,
                    previewBuildMs: 42,
                    serverStartMs: 18,
                    browserLaunchMs: 12,
                    browserContextMs: 5,
                    browserPageMs: 6,
                    appBootstrapMs: 140,
                    scenarioEvalMs: 520,
                    reportWriteMs: 24,
                    publishWriteMs: 10,
                    totalMs: 781,
                },
                reportIo: {
                    jsonWriteMs: 11,
                    markdownWriteMs: 13,
                    totalWriteMs: 24,
                    totalBytes: 1536,
                    writes: [
                        { label: 'report-json', path: 'tmp/bot-validation-report.json', elapsedMs: 11, bytes: 768 },
                        { label: 'report-markdown', path: 'tmp/Testergebnisse.md', elapsedMs: 13, bytes: 768 },
                    ],
                },
                preview: {
                    buildPerformed: false,
                    serverReused: false,
                    buildElapsedMs: null,
                    serverStartElapsedMs: 18,
                },
                publish: {
                    jsonWriteMs: 5,
                    markdownWriteMs: 5,
                    totalWriteMs: 10,
                    totalBytes: 0,
                    wroteCanonicalJson: false,
                    wroteCanonicalMarkdown: false,
                    writes: [],
                },
                bottlenecks: [
                    { rank: 1, stage: 'scenario-eval', elapsedMs: 520 },
                    { rank: 2, stage: 'app-bootstrap', elapsedMs: 140 },
                ],
            },
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

test('V80 training gate fails hard when bot validation report is missing', async () => {
    const releaseLock = await acquireLatestIndexLock();
    const stamp = `TEST_GATE_MISSING_REPORT_${Date.now()}`;
    const latestBefore = await readFileIfExists(LATEST_INDEX_PATH);
    try {
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
        ]);

        let stdout = '';
        try {
            await execFileAsync(process.execPath, [
                TRAINING_GATE_SCRIPT,
                '--stamp', stamp,
                '--write-latest', 'true',
            ]);
            assert.fail('training-gate should fail when bot validation report is missing');
        } catch (error) {
            stdout = String(error?.stdout || '');
        }

        const result = parseLastJsonObject(stdout);
        const latestAfter = await readFileIfExists(LATEST_INDEX_PATH);
        assert.equal(result.ok, false);
        assert.equal(result.latestRestored, true);
        assert.equal(result.artifactFailures > 0, true);
        assert.equal(latestAfter, latestBefore);
    } finally {
        await restoreFile(LATEST_INDEX_PATH, latestBefore);
        await releaseLock();
    }
});

test('V80 training gate fails hard when preview/publish diagnostics are missing from bot validation report', async () => {
    const releaseLock = await acquireLatestIndexLock();
    const stamp = `TEST_GATE_MISSING_DIAGNOSTICS_${Date.now()}`;
    const reportPath = `data/training/test-bot-validation-missing-diagnostics-${stamp}.json`;
    const latestBefore = await readFileIfExists(LATEST_INDEX_PATH);
    try {
        await writePassingBotValidationReportWithoutDiagnostics(reportPath);
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
            assert.fail('training-gate should fail when preview/publish diagnostics are missing');
        } catch (error) {
            stdout = String(error?.stdout || '');
        }

        const result = parseLastJsonObject(stdout);
        const latestAfter = await readFileIfExists(LATEST_INDEX_PATH);
        assert.equal(result.ok, false);
        assert.equal(result.latestRestored, true);
        assert.equal(result.failureCounts['validation-lane-telemetry-missing'] > 0, true);
        assert.equal(result.failureCounts['preview-lane-missing'] > 0, true);
        assert.equal(result.failureCounts['publish-lane-missing'] > 0, true);
        assert.equal(latestAfter, latestBefore);
    } finally {
        await restoreFile(reportPath, null);
        await restoreFile(LATEST_INDEX_PATH, latestBefore);
        await releaseLock();
    }
});

test('V80 training gate fails hard when preview build evidence or canonical publish evidence is incomplete', async () => {
    const releaseLock = await acquireLatestIndexLock();
    const stamp = `TEST_GATE_INCOMPLETE_PREVIEW_PUBLISH_${Date.now()}`;
    const reportPath = `data/training/test-bot-validation-incomplete-preview-publish-${stamp}.json`;
    const latestBefore = await readFileIfExists(LATEST_INDEX_PATH);
    try {
        await writePassingBotValidationReportWithIncompletePreviewPublishEvidence(reportPath);
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
            assert.fail('training-gate should fail when preview build or canonical publish evidence is incomplete');
        } catch (error) {
            stdout = String(error?.stdout || '');
        }

        const result = parseLastJsonObject(stdout);
        const latestAfter = await readFileIfExists(LATEST_INDEX_PATH);
        assert.equal(result.ok, false);
        assert.equal(result.latestRestored, true);
        assert.equal(result.failureCounts['preview-lane-missing'] > 0, true);
        assert.equal(result.failureCounts['publish-lane-missing'] > 0, true);
        assert.equal(latestAfter, latestBefore);
    } finally {
        await restoreFile(reportPath, null);
        await restoreFile(LATEST_INDEX_PATH, latestBefore);
        await releaseLock();
    }
});
