import { open, readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '@playwright/test';

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function toPositiveInt(rawValue, fallback, min = 1, max = Number.MAX_SAFE_INTEGER) {
    const numeric = Number.parseInt(String(rawValue || ''), 10);
    if (!Number.isFinite(numeric)) return fallback;
    return Math.max(min, Math.min(max, numeric));
}

async function readLockFile(lockPath) {
    try {
        const raw = await readFile(lockPath, 'utf8');
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object') return null;
        return parsed;
    } catch {
        return null;
    }
}

async function writeLockFile(lockPath, payload) {
    const handle = await open(lockPath, 'wx');
    try {
        await handle.writeFile(`${JSON.stringify(payload, null, 2)}\n`, 'utf8');
    } finally {
        await handle.close();
    }
}

function isProcessAlive(pid) {
    const numericPid = Number(pid);
    if (!Number.isInteger(numericPid) || numericPid <= 0) return false;
    try {
        process.kill(numericPid, 0);
        return true;
    } catch (error) {
        return error?.code === 'EPERM';
    }
}

async function prewarmRuntime(testHost, testPort) {
    const url = `http://${testHost}:${testPort}/`;
    let lastError = null;

    for (let attempt = 0; attempt < 3; attempt += 1) {
        const browser = await chromium.launch();
        try {
            const page = await browser.newPage();
            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120_000 });
            await page.waitForSelector('#main-menu', { state: 'visible', timeout: 120_000 });
            return;
        } catch (error) {
            lastError = error;
            await sleep(2_000 * (attempt + 1));
        } finally {
            await browser.close();
        }
    }

    throw lastError || new Error(`[PlaywrightIsolation] Failed to prewarm runtime at ${url}`);
}

export default async function globalSetup() {
    const runTag = String(process.env.PW_RUN_TAG || `pid-${process.pid}`).trim();
    const testHost = String(process.env.TEST_HOST || '127.0.0.1').trim() || '127.0.0.1';
    const testPort = String(process.env.TEST_PORT || '').trim();
    const outputDir = String(process.env.PW_OUTPUT_DIR || '').trim();
    const workers = toPositiveInt(process.env.PW_WORKERS, 1, 1, 32);
    process.env.PW_WORKERS = String(workers);

    if (!testPort || !outputDir || !runTag) {
        throw new Error(
            '[PlaywrightIsolation] Missing mandatory isolation env. ' +
            'Required: TEST_PORT, PW_RUN_TAG, PW_OUTPUT_DIR.'
        );
    }

    const lockPath = path.resolve(process.cwd(), String(process.env.PW_LOCK_PATH || '.playwright-suite.lock'));
    const lockWaitMs = toPositiveInt(process.env.PW_LOCK_WAIT_MS, 300_000, 1_000, 3_600_000);
    const lockPollMs = toPositiveInt(process.env.PW_LOCK_POLL_MS, 250, 50, 10_000);
    const lockStaleMs = toPositiveInt(process.env.PW_LOCK_STALE_MS, 14_400_000, 30_000, 86_400_000);
    const startedAt = Date.now();
    const ownerToken = `${process.pid}-${startedAt}-${Math.random().toString(36).slice(2, 10)}`;
    const lockPayload = {
        ownerToken,
        pid: process.pid,
        runTag,
        testPort,
        outputDir,
        workers,
        startedAt,
        startedAtIso: new Date(startedAt).toISOString(),
    };

    while (Date.now() - startedAt < lockWaitMs) {
        try {
            await writeLockFile(lockPath, lockPayload);
            process.env.PW_SUITE_LOCK_PATH = lockPath;
            process.env.PW_SUITE_LOCK_OWNER = ownerToken;
            console.log(`[PlaywrightIsolation] lock acquired: ${lockPath}`);
            console.log(`[PlaywrightIsolation] TEST_HOST=${testHost} TEST_PORT=${testPort} PW_RUN_TAG=${runTag} PW_OUTPUT_DIR=${outputDir} PW_WORKERS=${workers}`);
            await prewarmRuntime(testHost, testPort);
            return;
        } catch (error) {
            if (error?.code !== 'EEXIST') {
                throw error;
            }

            const existingLock = await readLockFile(lockPath);
            const existingStartedAt = Number(existingLock?.startedAt || 0);
            const lockAgeMs = Date.now() - (Number.isFinite(existingStartedAt) ? existingStartedAt : 0);
            const existingPid = Number(existingLock?.pid || 0);
            if (!isProcessAlive(existingPid) || lockAgeMs > lockStaleMs) {
                await rm(lockPath, { force: true });
                continue;
            }

            await sleep(lockPollMs);
        }
    }

    const blockingLock = await readLockFile(lockPath);
    throw new Error(
        '[PlaywrightIsolation] Timed out waiting for lock. ' +
        `Path=${lockPath} waitMs=${lockWaitMs} ` +
        `blocking=${JSON.stringify(blockingLock || {})}`
    );
}
