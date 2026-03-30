import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

import { EDITOR_VIEW_PATHS } from '../src/shared/contracts/EditorPathContract.js';
import { RECORDING_DOWNLOAD_DIRECTORY } from '../src/shared/contracts/RecordingCaptureContract.js';

export const REQUIRED_ROOT_FILES = Object.freeze([
    'index.html',
    'style.css',
    'server.ps1',
    'start_game.bat',
    'start_editor.bat',
    'start_editor_local.bat',
]);

export const REQUIRED_DATA_DIRECTORIES = Object.freeze([
    'data/maps',
    'data/vehicles',
]);

export const REQUIRED_EDITOR_MARKER = '/editor/map-editor-3d.html';
export const ROOT_START_SCRIPT_PATTERN = /^start_.*\.bat$/i;

export function resolveRepoPath(repoRoot, relativePath) {
    return path.resolve(repoRoot, relativePath);
}

export function collectMissingPaths(repoRoot, relativePaths) {
    return relativePaths.filter((relativePath) => !existsSync(resolveRepoPath(repoRoot, relativePath)));
}

export function assertEditorStartScriptContainsEditorPath(repoRoot, relativeFilePath) {
    const source = readFileSync(resolveRepoPath(repoRoot, relativeFilePath), 'utf8');
    if (!source.includes(REQUIRED_EDITOR_MARKER)) {
        throw new Error(`${relativeFilePath} no longer contains ${REQUIRED_EDITOR_MARKER}`);
    }
}

export function collectRootStartScripts(repoRoot) {
    try {
        return readdirSync(repoRoot, { withFileTypes: true })
            .filter((entry) => entry.isFile() && ROOT_START_SCRIPT_PATTERN.test(entry.name))
            .map((entry) => entry.name)
            .sort((left, right) => left.localeCompare(right));
    } catch {
        return [];
    }
}

function addProtectionSource(sourceMap, {
    path: relativePath,
    category,
    source,
    reason,
}) {
    const normalizedPath = String(relativePath || '').trim().replace(/\\/g, '/');
    if (!normalizedPath) return;

    const existing = sourceMap.get(normalizedPath);
    if (!existing) {
        sourceMap.set(normalizedPath, {
            path: normalizedPath,
            category,
            sources: source ? [source] : [],
            reasons: reason ? [reason] : [],
        });
        return;
    }

    if (source && !existing.sources.includes(source)) {
        existing.sources.push(source);
    }
    if (reason && !existing.reasons.includes(reason)) {
        existing.reasons.push(reason);
    }
}

export function collectRootRuntimeProtectionSources(repoRoot) {
    const sourceMap = new Map();

    for (const relativePath of REQUIRED_ROOT_FILES) {
        addProtectionSource(sourceMap, {
            path: relativePath,
            category: 'root-file',
            source: 'check-root-runtime',
            reason: 'Verbindliche Root-Datei fuer Spielstart oder Editor-Einstieg.',
        });
    }

    for (const relativePath of REQUIRED_DATA_DIRECTORIES) {
        addProtectionSource(sourceMap, {
            path: relativePath,
            category: 'runtime-data',
            source: 'check-root-runtime',
            reason: 'Runtime-Datenpfad fuer Maps oder Vehicles.',
        });
    }

    for (const relativePath of collectRootStartScripts(repoRoot)) {
        addProtectionSource(sourceMap, {
            path: relativePath,
            category: 'start-script',
            source: 'start_*.bat',
            reason: 'Lokaler Bedienpfad im Root bleibt stabil.',
        });
    }

    for (const [key, route] of Object.entries(EDITOR_VIEW_PATHS)) {
        addProtectionSource(sourceMap, {
            path: String(route || '').replace(/^\/+/, ''),
            category: 'editor-view',
            source: `EDITOR_VIEW_PATHS.${key}`,
            reason: 'Editor-/Lab-Pfad bleibt fuer Menue- und Testnavigation stabil.',
        });
    }

    addProtectionSource(sourceMap, {
        path: RECORDING_DOWNLOAD_DIRECTORY,
        category: 'recording-output',
        source: 'RECORDING_DOWNLOAD_DIRECTORY',
        reason: 'Recorder-Exportziel bleibt als Root-Ordnername erhalten.',
    });

    return Array.from(sourceMap.values()).sort((left, right) => left.path.localeCompare(right.path));
}
