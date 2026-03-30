import { mkdir, readdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';
import { promisify } from 'node:util';
import { collectRootRuntimeProtectionSources } from './root-runtime-protection.mjs';
import {
    RECORDING_ARCHIVE_DIRECTORY,
    RECORDING_DOWNLOAD_DIRECTORY,
} from '../src/shared/contracts/RecordingCaptureContract.js';

const execFileAsync = promisify(execFile);

const cwd = process.cwd();
const args = new Set(process.argv.slice(2));
const applyMode = args.has('--apply');
const reportPath = path.resolve(
    cwd,
    String(process.env.WORKSPACE_CLEAN_REPORT || 'tmp/workspace-cleanup-report.json').trim()
);
const archiveRoot = path.resolve(
    cwd,
    String(process.env.WORKSPACE_ARCHIVE_ROOT || 'tmp/workspace-archive').trim()
);
const activeMinutes = Math.max(
    1,
    Number.parseInt(process.env.WORKSPACE_CLEAN_ACTIVE_MINUTES || '30', 10) || 30
);
const activeThresholdMs = activeMinutes * 60 * 1000;
const outputRetentionDays = Math.max(
    1,
    Number.parseInt(process.env.WORKSPACE_CLEAN_OUTPUT_RETENTION_DAYS || '14', 10) || 14
);
const videoRetentionDays = Math.max(
    1,
    Number.parseInt(process.env.WORKSPACE_CLEAN_VIDEO_RETENTION_DAYS || '14', 10) || 14
);
const retainLatestRuns = Math.max(
    1,
    Number.parseInt(process.env.WORKSPACE_CLEAN_RETAIN_LATEST || '2', 10) || 2
);
const now = Date.now();
const dayMs = 24 * 60 * 60 * 1000;

const ROOT_LOG_PATTERNS = Object.freeze([
    /^tmp-dev-\d+\.(out|err)\.log$/i,
    /^tmp-vite(?:-[^.\\/]+)*\.(out|err)\.log$/i,
]);

const DEV_LOG_DIRECTORY = path.resolve(cwd, 'tmp', 'dev-logs');
const TMP_DIRECTORY = path.resolve(cwd, 'tmp');
const DEV_LOG_PATTERNS = Object.freeze([
    /^vite-dev-.*\.(out|err)\.log$/i,
    /^vite-dev-.*\.meta\.json$/i,
]);
const TMP_PROTECTED_ENTRY_NAMES = new Set([
    'dev-logs',
    'test-latest-index.lock',
]);
const TMP_DELETE_DIR_PATTERNS = Object.freeze([
    /^boost-toggle-spotcheck$/i,
    /^crosshair-restart-spotcheck$/i,
    /^develop-web-game-/i,
    /^fight-mode-analysis-runtime$/i,
    /^repro-/i,
    /^trace[-_]/i,
]);
const TMP_DELETE_FILE_PATTERNS = Object.freeze([
    /^audit_phase/i,
    /^bot[-_]/i,
    /^boost-toggle-/i,
    /^bv-/i,
    /^camera-/i,
    /^canvas-/i,
    /^dev-/i,
    /^devserver/i,
    /^develop-web-game-/i,
    /^knip-/i,
    /^map-/i,
    /^menu-review/i,
    /^normal-start/i,
    /^patch_/i,
    /^perf[-_]/i,
    /^playwright\./i,
    /^portal-/i,
    /^preview-/i,
    /^repro-/i,
    /^run-runtime-/i,
    /^runtime-/i,
    /^start-vite-/i,
    /^t\d+/i,
    /^v\d+/i,
    /^vite/i,
    /^web_game_playwright_/i,
    /^workspace-cleanup-/i,
]);

const ARCHIVE_ROOTS = Object.freeze([
    {
        name: 'backups',
        risk: 'low',
        reason: 'Historischer Root-Ordner; bei Bedarf nach docs/archive/workspace/root-history/backups-legacy verschieben.',
        archivePath: 'docs/archive/workspace/root-history/backups-legacy',
    },
    {
        name: 'output',
        risk: 'low',
        reason: 'Output-Container bleibt lokal; einzelne alte Runs werden per Retention-Regel nach tmp/workspace-archive/output verschoben.',
        action: 'protect',
    },
    {
        name: 'phase2_2026-03-02',
        risk: 'low',
        reason: 'Versionierter Historienordner; bei Bedarf nach docs/archive/workspace/root-history/phase2_2026-03-02 verschieben.',
        archivePath: 'docs/archive/workspace/root-history/phase2_2026-03-02',
    },
]);

const PROTECTED_ROOTS = Object.freeze([
    {
        name: '.codex_tmp',
        risk: 'medium',
        reason: 'Lokaler Agent-Arbeitsbereich; waehrend aktiver Session nicht automatisch entfernen.',
    },
    {
        name: 'prototypes',
        risk: 'high',
        reason: 'Vehicle-Lab und Runtime importieren noch direkt aus diesem Pfad.',
    },
    {
        name: 'tmp',
        risk: 'medium',
        reason: 'Enthaelt Locks, Diagnoseartefakte und lokale Evidence; nur selektive Unterpfade bereinigen.',
    },
    {
        name: RECORDING_DOWNLOAD_DIRECTORY,
        risk: 'medium',
        reason: 'Ordnername ist aktiver Recording-Contract und bleibt bestehen; alte Clips werden per Retention-Regel nach tmp/workspace-archive/videos verschoben.',
    },
]);

function createItem({
    path: relativePath,
    type,
    action,
    risk,
    reason,
    sizeBytes = null,
    mtimeMs = null,
    archivePath = null,
    retention = null,
}) {
    const normalizedArchivePath = archivePath
        ? path.relative(cwd, path.resolve(String(archivePath))).replace(/\\/g, '/')
        : null;
    return {
        path: relativePath.replace(/\\/g, '/'),
        type,
        action,
        risk,
        reason,
        sizeBytes,
        mtimeIso: Number.isFinite(mtimeMs) ? new Date(mtimeMs).toISOString() : null,
        archivePath: normalizedArchivePath,
        retention,
    };
}

async function exists(targetPath) {
    try {
        await stat(targetPath);
        return true;
    } catch {
        return false;
    }
}

async function readActivePlaywrightLock() {
    const lockPath = path.resolve(cwd, '.playwright-suite.lock');
    if (!(await exists(lockPath))) {
        return {
            active: false,
            outputRoot: null,
            reportRoot: null,
            reason: 'Keine Playwright-Lockdatei gefunden.',
        };
    }

    try {
        const [lockStat, raw] = await Promise.all([
            stat(lockPath),
            readFile(lockPath, 'utf8'),
        ]);
        const ageMs = now - Number(lockStat.mtimeMs || 0);
        if (ageMs > activeThresholdMs) {
            return {
                active: false,
                outputRoot: null,
                reportRoot: null,
                reason: `Lock aelter als ${activeMinutes} Minuten.`,
            };
        }

        const parsed = JSON.parse(raw);
        const outputRoot = String(parsed?.outputDir || '')
            .trim()
            .split(/[\\/]/)
            .filter(Boolean)[0] || null;
        const runTag = String(parsed?.runTag || '').trim();
        const reportRoot = runTag ? 'playwright-report' : null;
        return {
            active: true,
            outputRoot,
            reportRoot,
            reason: `Aktiver Playwright-Lock fuer runTag=${runTag || 'unknown'}.`,
        };
    } catch (error) {
        return {
            active: true,
            outputRoot: 'test-results',
            reportRoot: 'playwright-report',
            reason: `Lock vorhanden, aber nicht sauber lesbar: ${error?.message || String(error)}`,
        };
    }
}

function matchesPattern(patterns, filename) {
    return patterns.some((pattern) => pattern.test(filename));
}

function isRecentlyTouched(fileStat) {
    return now - Number(fileStat.mtimeMs || 0) <= activeThresholdMs;
}

function isWithinDays(fileStat, days) {
    return now - Number(fileStat.mtimeMs || 0) <= (days * dayMs);
}

async function collectRootEntries() {
    try {
        return await readdir(cwd, { withFileTypes: true });
    } catch {
        return [];
    }
}

async function collectDevLogItems() {
    try {
        const entries = await readdir(DEV_LOG_DIRECTORY, { withFileTypes: true });
        const items = [];
        for (const entry of entries) {
            if (!entry.isFile() || !matchesPattern(DEV_LOG_PATTERNS, entry.name)) continue;
            const targetPath = path.resolve(DEV_LOG_DIRECTORY, entry.name);
            const targetStat = await stat(targetPath);
            const relativePath = path.relative(cwd, targetPath);
            if (isRecentlyTouched(targetStat)) {
                items.push(createItem({
                    path: relativePath,
                    type: 'file',
                    action: 'protect',
                    risk: 'medium',
                    reason: `Juenger als ${activeMinutes} Minuten; moeglicherweise aktiver Dev-Log.`,
                    sizeBytes: Number(targetStat.size || 0),
                    mtimeMs: Number(targetStat.mtimeMs || 0),
                }));
                continue;
            }

            items.push(createItem({
                path: relativePath,
                type: 'file',
                action: 'delete',
                risk: 'low',
                reason: 'Verwaister Dev-Log nach Altersregel.',
                sizeBytes: Number(targetStat.size || 0),
                mtimeMs: Number(targetStat.mtimeMs || 0),
            }));
        }
        return items;
    } catch {
        return [];
    }
}

async function collectTmpRetentionItems() {
    try {
        const entries = await readdir(TMP_DIRECTORY, { withFileTypes: true });
        const items = [];
        for (const entry of entries) {
            const targetPath = path.resolve(TMP_DIRECTORY, entry.name);
            const targetStat = await stat(targetPath);
            const relativePath = path.relative(cwd, targetPath);
            const recent = isRecentlyTouched(targetStat);

            if (TMP_PROTECTED_ENTRY_NAMES.has(entry.name)) {
                items.push(createItem({
                    path: relativePath,
                    type: entry.isDirectory() ? 'dir' : 'file',
                    action: 'protect',
                    risk: 'medium',
                    reason: 'Explizit geschuetzter tmp-Pfad fuer Locks oder laufende Diagnose.',
                    sizeBytes: Number(targetStat.size || 0),
                    mtimeMs: Number(targetStat.mtimeMs || 0),
                }));
                continue;
            }

            if (entry.isDirectory() && matchesPattern(TMP_DELETE_DIR_PATTERNS, entry.name)) {
                items.push(createItem({
                    path: relativePath,
                    type: 'dir',
                    action: recent ? 'protect' : 'delete',
                    risk: recent ? 'medium' : 'low',
                    reason: recent
                        ? `Juenger als ${activeMinutes} Minuten; moeglicherweise aktiver tmp-Diagnoseordner.`
                        : 'Verwaister tmp-Diagnoseordner nach Retention-Regel.',
                    sizeBytes: null,
                    mtimeMs: Number(targetStat.mtimeMs || 0),
                }));
                continue;
            }

            if (entry.isFile() && matchesPattern(TMP_DELETE_FILE_PATTERNS, entry.name)) {
                items.push(createItem({
                    path: relativePath,
                    type: 'file',
                    action: recent ? 'protect' : 'delete',
                    risk: recent ? 'medium' : 'low',
                    reason: recent
                        ? `Juenger als ${activeMinutes} Minuten; moeglicherweise aktives tmp-Diagnoseartefakt.`
                        : 'Verwaistes tmp-Diagnoseartefakt nach Retention-Regel.',
                    sizeBytes: Number(targetStat.size || 0),
                    mtimeMs: Number(targetStat.mtimeMs || 0),
                }));
                continue;
            }

            items.push(createItem({
                path: relativePath,
                type: entry.isDirectory() ? 'dir' : 'file',
                action: 'protect',
                risk: 'medium',
                reason: 'Nicht in konservativer tmp-Retention-Allowlist.',
                sizeBytes: Number(targetStat.size || 0),
                mtimeMs: Number(targetStat.mtimeMs || 0),
            }));
        }
        return items;
    } catch {
        return [];
    }
}

async function collectRetentionArchiveItems(rootName, options = {}) {
    const targetDirectory = path.resolve(cwd, rootName);
    try {
        const entries = await readdir(targetDirectory, { withFileTypes: true });
        const childItems = [];
        for (const entry of entries) {
            if (entry.name === '.gitkeep') {
                const gitkeepPath = path.relative(cwd, path.resolve(targetDirectory, entry.name));
                const gitkeepStat = await stat(path.resolve(targetDirectory, entry.name));
                childItems.push(createItem({
                    path: gitkeepPath,
                    type: 'file',
                    action: 'protect',
                    risk: 'low',
                    reason: `${rootName}-Container bleibt ueber .gitkeep bestehen.`,
                    sizeBytes: Number(gitkeepStat.size || 0),
                    mtimeMs: Number(gitkeepStat.mtimeMs || 0),
                }));
                continue;
            }

            const targetPath = path.resolve(targetDirectory, entry.name);
            const targetStat = await stat(targetPath);
            childItems.push({
                entry,
                stat: targetStat,
                relativePath: path.relative(cwd, targetPath).replace(/\\/g, '/'),
            });
        }

        const sortedByFreshness = childItems
            .filter((item) => item?.stat)
            .sort((left, right) => Number(right.stat.mtimeMs || 0) - Number(left.stat.mtimeMs || 0));
        const retainedPaths = new Set(
            sortedByFreshness.slice(0, retainLatestRuns).map((item) => item.relativePath)
        );
        const items = [];

        for (const item of childItems) {
            if (item.action) {
                items.push(item);
                continue;
            }

            const isFresh = retainedPaths.has(item.relativePath) || isWithinDays(item.stat, options.retentionDays || 14);
            items.push(createItem({
                path: item.relativePath,
                type: item.entry.isDirectory() ? 'dir' : 'file',
                action: isFresh ? 'protect' : 'archive',
                risk: isFresh ? 'low' : 'medium',
                reason: isFresh
                    ? `${rootName}-Artefakt bleibt lokal (neuste ${retainLatestRuns} Eintraege oder juenger als ${options.retentionDays} Tage).`
                    : `${rootName}-Artefakt faellt unter die Retention-Regel und soll archiviert werden.`,
                sizeBytes: Number(item.stat.size || 0),
                mtimeMs: Number(item.stat.mtimeMs || 0),
                archivePath: isFresh
                    ? null
                    : path.join(options.archiveRoot || 'tmp/workspace-archive', rootName, path.basename(item.relativePath)),
                retention: {
                    retentionDays: options.retentionDays || 14,
                    retainLatest: retainLatestRuns,
                },
            }));
        }

        return items;
    } catch {
        return [];
    }
}

async function collectInventory() {
    const items = [];
    const activeLock = await readActivePlaywrightLock();
    const rootEntries = await collectRootEntries();

    for (const root of ARCHIVE_ROOTS) {
        const targetPath = path.resolve(cwd, root.name);
        if (!(await exists(targetPath))) continue;
        const targetStat = await stat(targetPath);
        items.push(createItem({
            path: root.name,
            type: targetStat.isDirectory() ? 'dir' : 'file',
            action: root.action || 'archive',
            risk: root.risk,
            reason: root.reason,
            sizeBytes: Number(targetStat.size || 0),
            mtimeMs: Number(targetStat.mtimeMs || 0),
            archivePath: root.archivePath || null,
        }));
    }

    for (const root of PROTECTED_ROOTS) {
        const targetPath = path.resolve(cwd, root.name);
        if (!(await exists(targetPath))) continue;
        const targetStat = await stat(targetPath);
        items.push(createItem({
            path: root.name,
            type: targetStat.isDirectory() ? 'dir' : 'file',
            action: 'protect',
            risk: root.risk,
            reason: root.reason,
            sizeBytes: Number(targetStat.size || 0),
            mtimeMs: Number(targetStat.mtimeMs || 0),
        }));
    }

    for (const entry of rootEntries) {
        const targetPath = path.resolve(cwd, entry.name);
        if (entry.isFile() && matchesPattern(ROOT_LOG_PATTERNS, entry.name)) {
            const targetStat = await stat(targetPath);
            const recent = isRecentlyTouched(targetStat);
            items.push(createItem({
                path: entry.name,
                type: 'file',
                action: recent ? 'protect' : 'delete',
                risk: recent ? 'medium' : 'low',
                reason: recent
                    ? `Juenger als ${activeMinutes} Minuten; moeglicherweise aktiver Root-Log.`
                    : 'Verwaister Root-Log nach Altersregel.',
                sizeBytes: Number(targetStat.size || 0),
                mtimeMs: Number(targetStat.mtimeMs || 0),
            }));
            continue;
        }

        if (!entry.isDirectory()) continue;

        if (entry.name === 'dist') {
            const targetStat = await stat(targetPath);
            items.push(createItem({
                path: entry.name,
                type: 'dir',
                action: 'delete',
                risk: 'low',
                reason: 'Ignoriertes Build-Artefakt; bei Bedarf reproduzierbar ueber npm run build.',
                sizeBytes: null,
                mtimeMs: Number(targetStat.mtimeMs || 0),
            }));
            continue;
        }

        if (/^test-results($|-)/i.test(entry.name)) {
            const targetStat = await stat(targetPath);
            const isActiveRoot = activeLock.active && activeLock.outputRoot === entry.name;
            items.push(createItem({
                path: entry.name,
                type: 'dir',
                action: isActiveRoot ? 'protect' : 'delete',
                risk: isActiveRoot ? 'medium' : 'low',
                reason: isActiveRoot
                    ? activeLock.reason
                    : 'Ignoriertes Playwright-Artefakt ausserhalb des aktiven Lock-Ziels.',
                sizeBytes: null,
                mtimeMs: Number(targetStat.mtimeMs || 0),
            }));
            continue;
        }

        if (entry.name === 'playwright-report') {
            const targetStat = await stat(targetPath);
            const isActiveRoot = activeLock.active && activeLock.reportRoot === entry.name;
            items.push(createItem({
                path: entry.name,
                type: 'dir',
                action: isActiveRoot ? 'protect' : 'delete',
                risk: isActiveRoot ? 'medium' : 'low',
                reason: isActiveRoot
                    ? activeLock.reason
                    : 'Ignoriertes HTML-Report-Artefakt ausserhalb aktiver Runs.',
                sizeBytes: null,
                mtimeMs: Number(targetStat.mtimeMs || 0),
            }));
        }
    }

    const devLogItems = await collectDevLogItems();
    items.push(...devLogItems);
    const tmpRetentionItems = await collectTmpRetentionItems();
    items.push(...tmpRetentionItems);
    const outputRetentionItems = await collectRetentionArchiveItems('output', {
        retentionDays: outputRetentionDays,
        archiveRoot,
    });
    items.push(...outputRetentionItems);
    const videoRetentionItems = await collectRetentionArchiveItems(RECORDING_DOWNLOAD_DIRECTORY, {
        retentionDays: videoRetentionDays,
        archiveRoot: path.resolve(cwd, path.dirname(RECORDING_ARCHIVE_DIRECTORY)),
    });
    items.push(...videoRetentionItems);

    await protectTrackedDeleteTargets(items);
    items.sort((left, right) => left.path.localeCompare(right.path));
    return { items, activeLock };
}

async function protectTrackedDeleteTargets(items) {
    const deleteCandidates = items.filter((item) => item.action === 'delete');
    if (deleteCandidates.length === 0) return;

    try {
        const { stdout } = await execFileAsync(
            'git',
            ['ls-files', '-z', '--', ...deleteCandidates.map((item) => item.path)],
            { cwd, maxBuffer: 8 * 1024 * 1024 }
        );
        const trackedPaths = String(stdout || '')
            .split('\0')
            .map((entry) => entry.trim())
            .filter(Boolean);
        if (trackedPaths.length === 0) return;

        for (const item of deleteCandidates) {
            const normalizedPath = item.path.replace(/\\/g, '/');
            const hasTrackedMatch = trackedPaths.some((trackedPath) => (
                trackedPath === normalizedPath
                || trackedPath.startsWith(`${normalizedPath}/`)
            ));
            if (!hasTrackedMatch) continue;

            item.action = 'protect';
            item.risk = 'medium';
            item.reason = 'Enthaelt versionierte Dateien; automatischer Cleanup ueberspringt git-getrackte Inhalte.';
        }
    } catch {
        for (const item of deleteCandidates) {
            item.action = 'protect';
            item.risk = 'medium';
            item.reason = 'Git-Tracking-Pruefung fehlgeschlagen; automatischer Cleanup bleibt konservativ.';
        }
    }
}

async function writeReport(report) {
    await mkdir(path.dirname(reportPath), { recursive: true });
    await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
}

async function applyArchives(items) {
    const results = [];
    for (const item of items) {
        if (item.action !== 'archive' || !item.archivePath) continue;
        const sourcePath = path.resolve(cwd, item.path);
        const targetPath = path.resolve(cwd, item.archivePath);
        try {
            await mkdir(path.dirname(targetPath), { recursive: true });
            await rm(targetPath, { recursive: true, force: true });
            await rename(sourcePath, targetPath);
            results.push({ path: item.path, archivePath: item.archivePath, ok: true });
        } catch (error) {
            results.push({
                path: item.path,
                archivePath: item.archivePath,
                ok: false,
                error: error?.message || String(error),
            });
        }
    }
    return results;
}

async function applyDeletes(items) {
    const results = [];
    for (const item of items) {
        if (item.action !== 'delete') continue;
        const absolutePath = path.resolve(cwd, item.path);
        try {
            await rm(absolutePath, { recursive: item.type === 'dir', force: true });
            results.push({ path: item.path, ok: true });
        } catch (error) {
            results.push({ path: item.path, ok: false, error: error?.message || String(error) });
        }
    }
    return results;
}

function summarize(items) {
    return items.reduce((accumulator, item) => {
        accumulator[item.action] = (accumulator[item.action] || 0) + 1;
        return accumulator;
    }, { delete: 0, archive: 0, protect: 0 });
}

async function main() {
    const { items, activeLock } = await collectInventory();
    const summary = summarize(items);
    const protectionSources = collectRootRuntimeProtectionSources(cwd);
    const report = {
        generatedAt: new Date(now).toISOString(),
        mode: applyMode ? 'apply' : 'dry-run',
        activeMinutes,
        archiveRoot: path.relative(cwd, archiveRoot).replace(/\\/g, '/'),
        activePlaywrightLock: activeLock,
        protectionSources,
        summary,
        items,
        archiveResults: [],
        applyResults: [],
    };

    process.stdout.write(`[cleanup:workspace] mode=${report.mode}\n`);
    process.stdout.write(`[cleanup:workspace] report=${path.relative(cwd, reportPath).replace(/\\/g, '/')}\n`);
    process.stdout.write(`[cleanup:workspace] protection_sources=${protectionSources.length}\n`);
    process.stdout.write(`[cleanup:workspace] delete=${summary.delete} archive=${summary.archive} protect=${summary.protect}\n`);

    for (const item of items) {
        process.stdout.write(
            `[cleanup:workspace] ${item.action} ${item.type} ${item.path} :: ${item.reason}\n`
        );
    }

    if (applyMode) {
        report.archiveResults = await applyArchives(items);
        report.applyResults = await applyDeletes(items);
        const archiveFailed = report.archiveResults.filter((entry) => !entry.ok);
        const failed = report.applyResults.filter((entry) => !entry.ok);
        process.stdout.write(`[cleanup:workspace] archived=${report.archiveResults.length - archiveFailed.length}\n`);
        process.stdout.write(`[cleanup:workspace] archive_failed=${archiveFailed.length}\n`);
        process.stdout.write(`[cleanup:workspace] applied=${report.applyResults.length - failed.length}\n`);
        process.stdout.write(`[cleanup:workspace] failed=${failed.length}\n`);
        if (failed.length > 0 || archiveFailed.length > 0) {
            process.exitCode = 1;
        }
    }

    await writeReport(report);
}

main().catch((error) => {
    process.stderr.write(`${error?.stack || String(error)}\n`);
    process.exitCode = 1;
});
